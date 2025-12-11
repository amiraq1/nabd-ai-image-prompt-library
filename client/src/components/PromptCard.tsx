import { useState } from "react";
import { Wand2, Copy, Check, Eye, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { categories, type Prompt } from "@shared/schema";

interface PromptCardProps {
  prompt: Prompt;
  onGenerate: (prompt: Prompt) => void;
  onView: (prompt: Prompt) => void;
  isLiked?: boolean;
  onLike?: (promptId: string) => void;
  onUnlike?: (promptId: string) => void;
}

export function PromptCard({ 
  prompt, 
  onGenerate, 
  onView, 
  isLiked = false,
  onLike,
  onUnlike,
}: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const category = categories.find((c) => c.id === prompt.category);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(prompt.promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiked) {
      onUnlike?.(prompt.id);
    } else {
      onLike?.(prompt.id);
    }
  };

  const placeholderGradients = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-amber-500",
    "from-pink-500 to-rose-500",
    "from-indigo-500 to-blue-500",
  ];

  const gradientIndex = prompt.id.charCodeAt(0) % placeholderGradients.length;
  const gradient = placeholderGradients[gradientIndex];

  return (
    <Card
      className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onView(prompt)}
      data-testid={`card-prompt-${prompt.id}`}
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        {prompt.generatedImageUrl ? (
          <img
            src={prompt.generatedImageUrl}
            alt={prompt.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Wand2 className="h-12 w-12 text-white/50" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute top-3 right-3 flex items-center gap-2">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
            {category?.nameAr}
          </Badge>
        </div>

        <div className="absolute top-3 left-3 z-20">
          <Button
            variant="ghost"
            size="icon"
            className={`bg-background/60 backdrop-blur-sm ${isLiked ? 'text-red-500' : 'text-white'}`}
            onClick={handleLikeClick}
            data-testid={`button-like-${prompt.id}`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
          </Button>
        </div>

        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 transition-opacity duration-300 z-10 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onGenerate(prompt);
            }}
            className="bg-primary text-primary-foreground"
            data-testid={`button-generate-${prompt.id}`}
          >
            <Wand2 className="h-4 w-4 ml-2" />
            توليد صورة
          </Button>
          <Button
            variant="outline"
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white"
            onClick={(e) => {
              e.stopPropagation();
              onView(prompt);
            }}
            data-testid={`button-view-${prompt.id}`}
          >
            <Eye className="h-4 w-4 ml-2" />
            عرض التفاصيل
          </Button>
        </div>

        <div className="absolute bottom-0 right-0 left-0 p-4">
          <h3 className="font-bold text-lg text-white mb-1 line-clamp-1">
            {prompt.title}
          </h3>
          <p className="text-white/80 text-sm line-clamp-2">
            {prompt.promptText}
          </p>
        </div>
      </div>

      <div className="p-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-1 text-muted-foreground text-sm shrink-0">
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span data-testid={`text-likes-${prompt.id}`}>{prompt.likesCount || 0}</span>
          </div>
          <p className="text-muted-foreground text-sm flex-1 line-clamp-1 min-w-0">
            {prompt.description}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="shrink-0"
          data-testid={`button-copy-${prompt.id}`}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </Card>
  );
}
