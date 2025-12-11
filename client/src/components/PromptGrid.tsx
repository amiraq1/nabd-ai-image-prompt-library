import { memo, useMemo } from "react";
import { PromptCard } from "./PromptCard";
import { Skeleton } from "@/components/ui/skeleton";
import { type Prompt } from "@shared/schema";

interface PromptGridProps {
  prompts: Prompt[];
  isLoading: boolean;
  isFetching?: boolean;
  onGenerate: (prompt: Prompt) => void;
  onView: (prompt: Prompt) => void;
  likedPromptIds?: string[];
  onLike?: (promptId: string) => void;
  onUnlike?: (promptId: string) => void;
}

const PromptCardSkeleton = memo(function PromptCardSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-card animate-pulse">
      <div className="aspect-[4/3] w-full animate-shimmer bg-muted" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
});

export const PromptGrid = memo(function PromptGrid({ 
  prompts, 
  isLoading,
  isFetching = false,
  onGenerate, 
  onView,
  likedPromptIds = [],
  onLike,
  onUnlike,
}: PromptGridProps) {
  
  // Memoize liked set for faster lookups
  const likedSet = useMemo(() => new Set(likedPromptIds), [likedPromptIds]);
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <PromptCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={`relative ${isFetching ? 'opacity-70' : 'opacity-100'} transition-opacity duration-200`}>
      {isFetching && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full animate-pulse-soft">
            جاري التحديث...
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {prompts.map((prompt, index) => (
          <div
            key={prompt.id}
            className="animate-fade-in gpu-accelerated"
            style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
          >
            <PromptCard
              prompt={prompt}
              onGenerate={onGenerate}
              onView={onView}
              isLiked={likedSet.has(prompt.id)}
              onLike={onLike}
              onUnlike={onUnlike}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
