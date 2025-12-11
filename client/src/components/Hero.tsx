import { Activity, Search, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onExplore: () => void;
}

export function Hero({ searchQuery, onSearchChange, onExplore }: HeroProps) {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
      
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 mb-6 border border-white/20">
          <Activity className="h-4 w-4 text-yellow-300" />
          <span className="text-white/90 text-sm">مدعوم بالذكاء الاصطناعي Gemini</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
          نبض
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-l from-yellow-200 to-pink-200">
            إبداع الصور بالذكاء الاصطناعي
          </span>
        </h1>

        <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          اكتشف أفضل الأوامر لإنشاء صور مذهلة، أو أضف أوامرك الخاصة وشاركها مع المجتمع
        </p>

        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="ابحث عن أوامر لتوليد الصور..."
              className="pr-12 h-14 text-lg bg-white/95 border-0 shadow-xl"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              data-testid="input-hero-search"
            />
          </div>
        </div>

        <Button
          size="lg"
          variant="outline"
          className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20"
          onClick={onExplore}
          data-testid="button-explore"
        >
          <ArrowDown className="h-4 w-4 ml-2" />
          استكشف الأوامر
        </Button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
