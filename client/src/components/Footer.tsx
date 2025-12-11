import { Activity, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">نبض</span>
          </div>

          <p className="text-muted-foreground text-sm text-center">
            منصة لإبداع وتوليد الصور بالذكاء الاصطناعي
          </p>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>صُنع بـ</span>
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            <span>باستخدام Gemini AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
