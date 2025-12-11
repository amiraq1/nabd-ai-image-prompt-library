import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateImage } from "./gemini";
import { insertPromptSchema, type SearchFilters, type CategoryId } from "@shared/schema";
import { randomUUID } from "crypto";

// Rate limiting بسيط في الذاكرة
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // دقيقة واحدة
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 طلبات توليد صور في الدقيقة

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(sessionId);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(sessionId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

// تنظيف سجلات rate limit القديمة كل 5 دقائق
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

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
        sameSite: 'lax'
      });
    }
    
    return sessionId;
  }

  // Get all prompts with optional filters and pagination
  app.get("/api/prompts", async (req, res) => {
    try {
      const filters: SearchFilters = {};
      
      if (req.query.q) {
        filters.query = req.query.q as string;
      }
      if (req.query.category) {
        filters.category = req.query.category as CategoryId;
      }
      if (req.query.sortBy) {
        filters.sortBy = req.query.sortBy as "recent" | "popular" | "mostLiked";
      }
      if (req.query.minLikes) {
        filters.minLikes = parseInt(req.query.minLikes as string, 10);
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

  // Create new prompt
  app.post("/api/prompts", async (req, res) => {
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

  // Generate image for a prompt (with rate limiting)
  app.post("/api/prompts/:id/generate", async (req, res) => {
    try {
      const sessionId = getSessionId(req, res);
      
      // التحقق من Rate Limit
      if (!checkRateLimit(sessionId)) {
        return res.status(429).json({ 
          error: "Too many requests", 
          message: "لقد تجاوزت الحد المسموح من الطلبات. حاول مرة أخرى بعد دقيقة."
        });
      }
      
      const prompt = await storage.getPromptById(req.params.id);
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
