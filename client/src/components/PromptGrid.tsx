import { PromptCard } from "./PromptCard";
import { Skeleton } from "@/components/ui/skeleton";
import { type Prompt } from "@shared/schema";

interface PromptGridProps {
  prompts: Prompt[];
  isLoading: boolean;
  onGenerate: (prompt: Prompt) => void;
  onView: (prompt: Prompt) => void;
  likedPromptIds?: string[];
  onLike?: (promptId: string) => void;
  onUnlike?: (promptId: string) => void;
}

function PromptCardSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-card">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function PromptGrid({ 
  prompts, 
  isLoading, 
  onGenerate, 
  onView,
  likedPromptIds = [],
  onLike,
  onUnlike,
}: PromptGridProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {prompts.map((prompt, index) => (
        <div
          key={prompt.id}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <PromptCard
            prompt={prompt}
            onGenerate={onGenerate}
            onView={onView}
            isLiked={likedPromptIds.includes(prompt.id)}
            onLike={onLike}
            onUnlike={onUnlike}
          />
        </div>
      ))}
    </div>
  );
}
