import { Search, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: "no-results" | "no-prompts";
  searchQuery?: string;
  onAddPrompt: () => void;
}

export function EmptyState({ type, searchQuery, onAddPrompt }: EmptyStateProps) {
  if (type === "no-results") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Search className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold mb-2">لا توجد نتائج</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          لم نجد أي أوامر تطابق "{searchQuery}". جرب كلمات بحث مختلفة أو أضف أمراً جديداً.
        </p>
        <Button onClick={onAddPrompt} data-testid="button-add-prompt-empty">
          <Plus className="h-4 w-4 ml-2" />
          إضافة أمر جديد
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6">
        <Sparkles className="h-12 w-12 text-white" />
      </div>
      <h3 className="text-2xl font-bold mb-2">ابدأ رحلتك الإبداعية</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        أضف أول أمر لتوليد الصور بالذكاء الاصطناعي وابدأ في بناء مكتبتك الخاصة.
      </p>
      <Button size="lg" onClick={onAddPrompt} data-testid="button-add-first-prompt">
        <Plus className="h-5 w-5 ml-2" />
        أضف أول أمر
      </Button>
    </div>
  );
}
