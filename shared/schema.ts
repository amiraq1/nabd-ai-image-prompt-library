import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Categories for prompts
export const categories = [
  { id: "nature", nameAr: "طبيعة", nameEn: "Nature", icon: "Mountain" },
  { id: "art", nameAr: "فن", nameEn: "Art", icon: "Palette" },
  { id: "design", nameAr: "تصميم", nameEn: "Design", icon: "PenTool" },
  { id: "characters", nameAr: "شخصيات", nameEn: "Characters", icon: "Users" },
  { id: "fantasy", nameAr: "خيال", nameEn: "Fantasy", icon: "Sparkles" },
  { id: "architecture", nameAr: "معمار", nameEn: "Architecture", icon: "Building" },
  { id: "abstract", nameAr: "تجريدي", nameEn: "Abstract", icon: "Shapes" },
  { id: "portrait", nameAr: "بورتريه", nameEn: "Portrait", icon: "User" },
] as const;

export type CategoryId = typeof categories[number]["id"];

// Prompts table
export const prompts = pgTable("prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  promptText: text("prompt_text").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  generatedImageUrl: text("generated_image_url"),
  usageCount: integer("usage_count").notNull().default(0),
  likesCount: integer("likes_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPromptSchema = createInsertSchema(prompts).pick({
  title: true,
  promptText: true,
  description: true,
  category: true,
}).extend({
  title: z.string()
    .min(3, "العنوان يجب أن يكون 3 أحرف على الأقل")
    .max(100, "العنوان يجب أن يكون أقل من 100 حرف")
    .transform(val => val.trim())
    .refine(val => !/<[^>]*>/g.test(val), "العنوان يحتوي على محتوى غير مسموح"),
  promptText: z.string()
    .min(10, "الأمر يجب أن يكون 10 أحرف على الأقل")
    .max(2000, "الأمر يجب أن يكون أقل من 2000 حرف")
    .transform(val => val.trim()),
  description: z.string()
    .min(5, "الوصف يجب أن يكون 5 أحرف على الأقل")
    .max(500, "الوصف يجب أن يكون أقل من 500 حرف")
    .transform(val => val.trim())
    .refine(val => !/<[^>]*>/g.test(val), "الوصف يحتوي على محتوى غير مسموح"),
  category: z.enum(["nature", "art", "design", "characters", "fantasy", "architecture", "abstract", "portrait"]),
});

export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Prompt = typeof prompts.$inferSelect;

// Generated Images table
export const generatedImages = pgTable("generated_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promptId: varchar("prompt_id").notNull().references(() => prompts.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGeneratedImageSchema = createInsertSchema(generatedImages).pick({
  promptId: true,
  imageUrl: true,
});

export type InsertGeneratedImage = z.infer<typeof insertGeneratedImageSchema>;
export type GeneratedImage = typeof generatedImages.$inferSelect;

// Prompt Likes table (anonymous likes by session/IP)
export const promptLikes = pgTable("prompt_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promptId: varchar("prompt_id").notNull().references(() => prompts.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPromptLikeSchema = createInsertSchema(promptLikes).pick({
  promptId: true,
  sessionId: true,
});

export type InsertPromptLike = z.infer<typeof insertPromptLikeSchema>;
export type PromptLike = typeof promptLikes.$inferSelect;

// Search and filter types
export interface SearchFilters {
  query?: string;
  category?: CategoryId;
  sortBy?: "recent" | "popular" | "mostLiked";
  minLikes?: number;
}
