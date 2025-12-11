import { eq, desc, sql, ilike, and, or } from "drizzle-orm";
import { db } from "./db";
import { 
  users, 
  prompts, 
  generatedImages, 
  promptLikes,
  type User, 
  type InsertUser, 
  type Prompt, 
  type InsertPrompt, 
  type GeneratedImage,
  type SearchFilters,
  type CategoryId
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllPrompts(filters?: SearchFilters): Promise<Prompt[]>;
  getPromptById(id: string): Promise<Prompt | undefined>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: string, updates: Partial<Prompt>): Promise<Prompt | undefined>;
  deletePrompt(id: string): Promise<boolean>;
  incrementUsageCount(id: string): Promise<void>;
  
  getGeneratedImages(promptId: string): Promise<GeneratedImage[]>;
  saveGeneratedImage(promptId: string, imageUrl: string): Promise<GeneratedImage>;
  
  likePrompt(promptId: string, sessionId: string): Promise<boolean>;
  unlikePrompt(promptId: string, sessionId: string): Promise<boolean>;
  hasLiked(promptId: string, sessionId: string): Promise<boolean>;
  getUserLikedPrompts(sessionId: string): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getAllPrompts(filters?: SearchFilters): Promise<Prompt[]> {
    let conditions: any[] = [];
    
    if (filters?.query) {
      const searchTerm = `%${filters.query}%`;
      conditions.push(
        or(
          ilike(prompts.title, searchTerm),
          ilike(prompts.promptText, searchTerm),
          ilike(prompts.description, searchTerm)
        )
      );
    }
    
    if (filters?.category) {
      conditions.push(eq(prompts.category, filters.category));
    }
    
    if (filters?.minLikes !== undefined && filters.minLikes > 0) {
      conditions.push(sql`${prompts.likesCount} >= ${filters.minLikes}`);
    }

    let orderBy;
    switch (filters?.sortBy) {
      case "recent":
        orderBy = desc(prompts.createdAt);
        break;
      case "mostLiked":
        orderBy = desc(prompts.likesCount);
        break;
      case "popular":
      default:
        orderBy = desc(prompts.usageCount);
        break;
    }

    const query = conditions.length > 0
      ? db.select().from(prompts).where(and(...conditions)).orderBy(orderBy)
      : db.select().from(prompts).orderBy(orderBy);
    
    return await query;
  }

  async getPromptById(id: string): Promise<Prompt | undefined> {
    const result = await db.select().from(prompts).where(eq(prompts.id, id)).limit(1);
    return result[0];
  }

  async createPrompt(insertPrompt: InsertPrompt): Promise<Prompt> {
    const result = await db.insert(prompts).values(insertPrompt).returning();
    return result[0];
  }

  async updatePrompt(id: string, updates: Partial<Prompt>): Promise<Prompt | undefined> {
    const result = await db
      .update(prompts)
      .set(updates)
      .where(eq(prompts.id, id))
      .returning();
    return result[0];
  }

  async deletePrompt(id: string): Promise<boolean> {
    const result = await db.delete(prompts).where(eq(prompts.id, id)).returning();
    return result.length > 0;
  }

  async incrementUsageCount(id: string): Promise<void> {
    await db
      .update(prompts)
      .set({ usageCount: sql`${prompts.usageCount} + 1` })
      .where(eq(prompts.id, id));
  }

  async getGeneratedImages(promptId: string): Promise<GeneratedImage[]> {
    return await db
      .select()
      .from(generatedImages)
      .where(eq(generatedImages.promptId, promptId))
      .orderBy(desc(generatedImages.createdAt));
  }

  async saveGeneratedImage(promptId: string, imageUrl: string): Promise<GeneratedImage> {
    const result = await db
      .insert(generatedImages)
      .values({ promptId, imageUrl })
      .returning();
    
    await db
      .update(prompts)
      .set({ generatedImageUrl: imageUrl })
      .where(eq(prompts.id, promptId));
    
    return result[0];
  }

  async likePrompt(promptId: string, sessionId: string): Promise<boolean> {
    const existing = await db
      .select()
      .from(promptLikes)
      .where(and(
        eq(promptLikes.promptId, promptId),
        eq(promptLikes.sessionId, sessionId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      return false;
    }
    
    await db.insert(promptLikes).values({ promptId, sessionId });
    await db
      .update(prompts)
      .set({ likesCount: sql`${prompts.likesCount} + 1` })
      .where(eq(prompts.id, promptId));
    
    return true;
  }

  async unlikePrompt(promptId: string, sessionId: string): Promise<boolean> {
    const result = await db
      .delete(promptLikes)
      .where(and(
        eq(promptLikes.promptId, promptId),
        eq(promptLikes.sessionId, sessionId)
      ))
      .returning();
    
    if (result.length === 0) {
      return false;
    }
    
    await db
      .update(prompts)
      .set({ likesCount: sql`${prompts.likesCount} - 1` })
      .where(eq(prompts.id, promptId));
    
    return true;
  }

  async hasLiked(promptId: string, sessionId: string): Promise<boolean> {
    const result = await db
      .select()
      .from(promptLikes)
      .where(and(
        eq(promptLikes.promptId, promptId),
        eq(promptLikes.sessionId, sessionId)
      ))
      .limit(1);
    
    return result.length > 0;
  }

  async getUserLikedPrompts(sessionId: string): Promise<string[]> {
    const result = await db
      .select({ promptId: promptLikes.promptId })
      .from(promptLikes)
      .where(eq(promptLikes.sessionId, sessionId));
    
    return result.map(r => r.promptId);
  }
}

export const storage = new DatabaseStorage();

// Seed default prompts if none exist
export async function seedDefaultPrompts() {
  const existingPrompts = await db.select().from(prompts).limit(1);
  if (existingPrompts.length > 0) {
    return;
  }

  const defaultPrompts: InsertPrompt[] = [
    {
      title: "غروب الشمس الساحر",
      promptText: "A breathtaking sunset over rolling mountains, with vibrant orange and purple sky, golden hour lighting, cinematic composition, ultra realistic, 8k quality",
      description: "منظر طبيعي خلاب لغروب الشمس فوق الجبال",
      category: "nature",
    },
    {
      title: "مدينة مستقبلية",
      promptText: "Futuristic cyberpunk city at night, neon lights reflecting on wet streets, flying cars, holographic advertisements, ultra detailed, concept art style",
      description: "مدينة من المستقبل بأضواء النيون والسيارات الطائرة",
      category: "architecture",
    },
    {
      title: "بورتريه فنتازي",
      promptText: "Ethereal fantasy portrait of an elven queen, intricate silver crown with gems, flowing white hair, magical forest background, soft lighting, digital art masterpiece",
      description: "صورة شخصية لملكة من عالم الخيال",
      category: "portrait",
    },
    {
      title: "لوحة تجريدية",
      promptText: "Abstract art composition with flowing liquid colors, deep blues and golds intertwining, marble texture, elegant and sophisticated, gallery quality artwork",
      description: "لوحة فنية تجريدية بألوان متدفقة",
      category: "abstract",
    },
    {
      title: "تنين أسطوري",
      promptText: "Majestic dragon perched on a cliff, scales shimmering with iridescent colors, wings spread wide, dramatic stormy sky background, fantasy art, highly detailed",
      description: "تنين أسطوري على قمة جبل",
      category: "fantasy",
    },
    {
      title: "روبوت ذكي",
      promptText: "Sleek humanoid robot with glowing blue circuits, minimalist white design, standing in a high-tech laboratory, soft studio lighting, product photography style",
      description: "روبوت مستقبلي بتصميم أنيق",
      category: "design",
    },
    {
      title: "حديقة يابانية",
      promptText: "Serene Japanese zen garden with cherry blossoms, koi pond, wooden bridge, morning mist, peaceful atmosphere, traditional architecture, photorealistic",
      description: "حديقة يابانية هادئة مع أزهار الكرز",
      category: "nature",
    },
    {
      title: "محارب أسطوري",
      promptText: "Epic warrior in ornate golden armor, wielding a glowing sword, standing victorious on a battlefield, dramatic lighting, cinematic composition, fantasy art",
      description: "محارب ملحمي بدرع ذهبي",
      category: "characters",
    },
  ];

  for (const prompt of defaultPrompts) {
    await db.insert(prompts).values({
      ...prompt,
      usageCount: Math.floor(Math.random() * 50) + 10,
      likesCount: Math.floor(Math.random() * 30) + 5,
    });
  }
  
  console.log("Default prompts seeded successfully");
}
