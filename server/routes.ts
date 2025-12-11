import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateImage } from "./gemini";
import { insertPromptSchema, type SearchFilters, type CategoryId } from "@shared/schema";
import { randomUUID } from "crypto";

// Rate limiting محسن في الذاكرة
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMaps = {
  generate: new Map<string, RateLimitRecord>(),
  api: new Map<string, RateLimitRecord>(),
  write: new Map<string, RateLimitRecord>(),
};

// إعدادات Rate Limiting لكل نوع
const rateLimitConfigs = {
  generate: { window: 60000, max: 10 },  // 10 طلبات توليد صور في الدقيقة
  api: { window: 60000, max: 100 },      // 100 طلب API عام في الدقيقة
  write: { window: 60000, max: 20 },     // 20 عملية كتابة في الدقيقة
};

function checkRateLimit(identifier: string, type: keyof typeof rateLimitMaps): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const map = rateLimitMaps[type];
  const config = rateLimitConfigs[type];
  const record = map.get(identifier);
  
  if (!record || now > record.resetTime) {
    map.set(identifier, { count: 1, resetTime: now + config.window });
    return { allowed: true, remaining: config.max - 1, resetIn: config.window };
  }
  
  if (record.count >= config.max) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }
  
  record.count++;
  return { allowed: true, remaining: config.max - record.count, resetIn: record.resetTime - now };
}

// تنظيف سجلات rate limit القديمة كل 5 دقائق
setInterval(() => {
  const now = Date.now();
  for (const map of Object.values(rateLimitMaps)) {
    for (const [key, value] of map.entries()) {
      if (now > value.resetTime) {
        map.delete(key);
      }
    }
  }
}, 5 * 60 * 1000);

// Middleware للتحقق من Rate Limit
function rateLimitMiddleware(type: keyof typeof rateLimitMaps) {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const result = checkRateLimit(identifier, type);
    
    // إضافة headers للـ Rate Limit
    res.setHeader('X-RateLimit-Limit', rateLimitConfigs[type].max.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetIn / 1000).toString());
    
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'لقد تجاوزت الحد المسموح من الطلبات. حاول مرة أخرى لاحقاً.',
        retryAfter: Math.ceil(result.resetIn / 1000)
      });
    }
    
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Helper to get or create session ID for anonymous likes
  function getSessionId(req: Request, res: Response): string {
    let sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      sessionId = randomUUID();
      // حفظ الـ sessionId كـ cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 365 * 24 * 60 * 60 * 1000, // سنة واحدة
        sameSite: 'strict' // تحسين الأمان
      });
    }
    
    return sessionId;
  }

  // تطبيق Rate Limiting على جميع الـ API endpoints
  app.use('/api', rateLimitMiddleware('api'));

  // Get all prompts with optional filters and pagination
  app.get("/api/prompts", async (req, res) => {
    try {
      const filters: SearchFilters = {};
      
      if (req.query.q) {
        // تنظيف البحث من الأحرف الخاصة
        filters.query = String(req.query.q).slice(0, 100).replace(/[<>]/g, '');
      }
      if (req.query.category) {
        filters.category = req.query.category as CategoryId;
      }
      if (req.query.sortBy) {
        const validSortOptions = ["recent", "popular", "mostLiked"];
        const sortBy = req.query.sortBy as string;
        if (validSortOptions.includes(sortBy)) {
          filters.sortBy = sortBy as "recent" | "popular" | "mostLiked";
        }
      }
      if (req.query.minLikes) {
        filters.minLikes = Math.max(0, parseInt(req.query.minLikes as string, 10) || 0);
      }
      
      // Pagination
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = (page - 1) * limit;
      
      const result = await storage.getAllPrompts(filters, limit, offset);
      res.json({
        prompts: result.prompts,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasMore: page < Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching prompts:", error);
      res.status(500).json({ error: "Failed to fetch prompts" });
    }
  });

  // Get user's liked prompts
  app.get("/api/prompts/liked", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string || getSessionId(req, res);
      const likedPromptIds = await storage.getUserLikedPrompts(sessionId);
      res.json({ likedPromptIds, sessionId });
    } catch (error) {
      console.error("Error fetching liked prompts:", error);
      res.status(500).json({ error: "Failed to fetch liked prompts" });
    }
  });

  // Get single prompt by ID
  app.get("/api/prompts/:id", async (req, res) => {
    try {
      const prompt = await storage.getPromptById(req.params.id);
      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error fetching prompt:", error);
      res.status(500).json({ error: "Failed to fetch prompt" });
    }
  });

  // Create new prompt (with write rate limiting)
  app.post("/api/prompts", rateLimitMiddleware('write'), async (req, res) => {
    try {
      const validatedData = insertPromptSchema.parse(req.body);
      const prompt = await storage.createPrompt(validatedData);
      res.status(201).json(prompt);
    } catch (error: any) {
      console.error("Error creating prompt:", error);
      if (error.errors) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create prompt" });
    }
  });

  // Generate image for a prompt (with strict rate limiting)
  app.post("/api/prompts/:id/generate", rateLimitMiddleware('generate'), async (req, res) => {
    try {
      // التحقق من صحة ID
      const promptId = req.params.id;
      if (!promptId || typeof promptId !== 'string' || promptId.length > 100) {
        return res.status(400).json({ error: "Invalid prompt ID" });
      }
      
      const prompt = await storage.getPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }

      await storage.incrementUsageCount(prompt.id);

      const imageUrl = await generateImage(prompt.promptText);
      
      const savedImage = await storage.saveGeneratedImage(prompt.id, imageUrl);

      res.json({ 
        imageUrl: savedImage.imageUrl,
        promptId: prompt.id,
        imageId: savedImage.id,
      });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });

  // Get generated images for a prompt (gallery)
  app.get("/api/prompts/:id/images", async (req, res) => {
    try {
      const images = await storage.getGeneratedImages(req.params.id);
      res.json(images);
    } catch (error) {
      console.error("Error fetching images:", error);
      res.status(500).json({ error: "Failed to fetch images" });
    }
  });

  // Like a prompt
  app.post("/api/prompts/:id/like", async (req, res) => {
    try {
      const sessionId = req.body.sessionId || getSessionId(req);
      const success = await storage.likePrompt(req.params.id, sessionId);
      
      if (!success) {
        return res.status(400).json({ error: "Already liked", sessionId });
      }
      
      const prompt = await storage.getPromptById(req.params.id);
      res.json({ success: true, likesCount: prompt?.likesCount || 0, sessionId });
    } catch (error) {
      console.error("Error liking prompt:", error);
      res.status(500).json({ error: "Failed to like prompt" });
    }
  });

  // Unlike a prompt
  app.delete("/api/prompts/:id/like", async (req, res) => {
    try {
      const sessionId = req.body.sessionId || req.query.sessionId as string || getSessionId(req);
      const success = await storage.unlikePrompt(req.params.id, sessionId);
      
      if (!success) {
        return res.status(400).json({ error: "Not liked yet", sessionId });
      }
      
      const prompt = await storage.getPromptById(req.params.id);
      res.json({ success: true, likesCount: prompt?.likesCount || 0, sessionId });
    } catch (error) {
      console.error("Error unliking prompt:", error);
      res.status(500).json({ error: "Failed to unlike prompt" });
    }
  });

  // Check if user has liked a prompt
  app.get("/api/prompts/:id/like", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string || getSessionId(req);
      const hasLiked = await storage.hasLiked(req.params.id, sessionId);
      res.json({ hasLiked, sessionId });
    } catch (error) {
      console.error("Error checking like status:", error);
      res.status(500).json({ error: "Failed to check like status" });
    }
  });

  // Delete a prompt
  app.delete("/api/prompts/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePrompt(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting prompt:", error);
      res.status(500).json({ error: "Failed to delete prompt" });
    }
  });

  // Generate share URL for an image
  app.get("/api/share/:imageId", async (req, res) => {
    try {
      // In production, this would return a signed URL or redirect to a share page
      const baseUrl = process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : `http://localhost:${process.env.PORT || 5000}`;
      
      res.json({
        shareUrl: `${baseUrl}/share/${req.params.imageId}`,
        imageId: req.params.imageId,
      });
    } catch (error) {
      console.error("Error generating share URL:", error);
      res.status(500).json({ error: "Failed to generate share URL" });
    }
  });

  return httpServer;
}
