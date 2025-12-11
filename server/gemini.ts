import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // مللي ثانية
const REQUEST_TIMEOUT = 60000; // 60 ثانية

// دالة للانتظار
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// دالة مع timeout
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

export async function generateImage(prompt: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
          },
        }),
        REQUEST_TIMEOUT
      );

      const candidate = response.candidates?.[0];
      const imagePart = candidate?.content?.parts?.find((part: any) => part.inlineData);
      
      if (!imagePart?.inlineData?.data) {
        throw new Error("No image data in response");
      }

      const mimeType = imagePart.inlineData.mimeType || "image/png";
      return `data:${mimeType};base64,${imagePart.inlineData.data}`;
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);
      
      // لا نعيد المحاولة إذا كان الخطأ من نوع validation أو auth
      if (error.message?.includes("Invalid") || error.message?.includes("Unauthorized")) {
        break;
      }
      
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt); // زيادة وقت الانتظار تدريجياً
      }
    }
  }
  
  console.error("All retry attempts failed:", lastError);
  throw new Error("Failed to generate image after multiple attempts");
}
