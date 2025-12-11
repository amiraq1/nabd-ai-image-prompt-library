import { useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowUpDown, TrendingUp, Clock, Heart } from "lucide-react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { CategoryFilter } from "@/components/CategoryFilter";
import { PromptGrid } from "@/components/PromptGrid";
import { PromptDetail } from "@/components/PromptDetail";
import { AddPromptDialog } from "@/components/AddPromptDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useSessionId } from "@/hooks/use-session-id";
import { useDebounce } from "@/hooks/use-debounce";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Prompt, type InsertPrompt, type CategoryId, type SearchFilters } from "@shared/schema";

type SortOption = "recent" | "popular" | "mostLiked";

const sortOptions = [
  { value: "recent" as SortOption, label: "الأحدث", icon: Clock },
  { value: "popular" as SortOption, label: "الأكثر استخداماً", icon: TrendingUp },
  { value: "mostLiked" as SortOption, label: "الأكثر إعجاباً", icon: Heart },
];

export default function Home() {
  const { toast } = useToast();
  const sessionId = useSessionId();
  const promptsRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Debounce البحث لتحسين الأداء
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set("q", debouncedSearchQuery);
    if (selectedCategory) params.set("category", selectedCategory);
    if (sortBy) params.set("sortBy", sortBy);
    return params.toString();
  }, [debouncedSearchQuery, selectedCategory, sortBy]);

  // Response type للـ API الجديد مع Pagination
  interface PromptsResponse {
    prompts: Prompt[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  }

  const { data: promptsData, isLoading, isFetching } = useQuery<PromptsResponse>({
    queryKey: ["/api/prompts", { q: debouncedSearchQuery, category: selectedCategory, sortBy }],
    queryFn: async () => {
      const queryStr = buildQueryParams();
      const response = await fetch(`/api/prompts${queryStr ? `?${queryStr}` : ""}`);
      if (!response.ok) throw new Error("Failed to fetch prompts");
      return response.json();
    },
    placeholderData: (previousData) => previousData, // الحفاظ على البيانات السابقة أثناء التحميل
  });

  const prompts = promptsData?.prompts || [];

  const { data: likedData } = useQuery<{ likedPromptIds: string[] }>({
    queryKey: ["/api/prompts/liked", sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/prompts/liked?sessionId=${sessionId}`);
      if (!response.ok) throw new Error("Failed to fetch liked prompts");
      return response.json();
    },
    enabled: !!sessionId,
  });

  const likedPromptIds = likedData?.likedPromptIds || [];

  const addPromptMutation = useMutation({
    mutationFn: async (data: InsertPrompt) => {
      const response = await apiRequest("POST", "/api/prompts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      setAddDialogOpen(false);
      toast({
        title: "تم بنجاح",
        description: "تمت إضافة الأمر بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة الأمر",
        variant: "destructive",
      });
    },
  });

  const generateImageMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const response = await apiRequest("POST", `/api/prompts/${promptId}/generate`);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedImage(data.imageUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      if (selectedPrompt) {
        queryClient.invalidateQueries({ queryKey: ["/api/prompts", selectedPrompt.id, "images"] });
      }
      toast({
        title: "تم توليد الصورة",
        description: "تم توليد الصورة بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء توليد الصورة. حاول مرة أخرى.",
        variant: "destructive",
      });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const response = await apiRequest("POST", `/api/prompts/${promptId}/like`, { sessionId });
      return response.json();
    },
    // Optimistic update للإعجاب الفوري
    onMutate: async (promptId: string) => {
      // إلغاء أي طلبات جارية
      await queryClient.cancelQueries({ queryKey: ["/api/prompts/liked"] });
      await queryClient.cancelQueries({ queryKey: ["/api/prompts"] });
      
      // حفظ البيانات السابقة
      const previousLiked = queryClient.getQueryData<{ likedPromptIds: string[] }>(["/api/prompts/liked", sessionId]);
      const previousPrompts = queryClient.getQueryData<PromptsResponse>(["/api/prompts", { q: debouncedSearchQuery, category: selectedCategory, sortBy }]);
      
      // تحديث متفائل للإعجابات
      queryClient.setQueryData<{ likedPromptIds: string[] }>(["/api/prompts/liked", sessionId], (old) => ({
        likedPromptIds: [...(old?.likedPromptIds || []), promptId]
      }));
      
      // تحديث متفائل لعدد الإعجابات
      queryClient.setQueryData<PromptsResponse>(["/api/prompts", { q: debouncedSearchQuery, category: selectedCategory, sortBy }], (old) => {
        if (!old) return old;
        return {
          ...old,
          prompts: old.prompts.map(p => 
            p.id === promptId ? { ...p, likesCount: (p.likesCount || 0) + 1 } : p
          )
        };
      });
      
      return { previousLiked, previousPrompts };
    },
    onError: (_err, _promptId, context) => {
      // التراجع عند الخطأ
      if (context?.previousLiked) {
        queryClient.setQueryData(["/api/prompts/liked", sessionId], context.previousLiked);
      }
      if (context?.previousPrompts) {
        queryClient.setQueryData(["/api/prompts", { q: debouncedSearchQuery, category: selectedCategory, sortBy }], context.previousPrompts);
      }
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الإعجاب",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // تحديث البيانات من الخادم
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/liked"] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: async (promptId: string) => {
      const response = await fetch(`/api/prompts/${promptId}/like?sessionId=${sessionId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!response.ok) throw new Error("Failed to unlike");
      return response.json();
    },
    // Optimistic update لإلغاء الإعجاب الفوري
    onMutate: async (promptId: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/prompts/liked"] });
      await queryClient.cancelQueries({ queryKey: ["/api/prompts"] });
      
      const previousLiked = queryClient.getQueryData<{ likedPromptIds: string[] }>(["/api/prompts/liked", sessionId]);
      const previousPrompts = queryClient.getQueryData<PromptsResponse>(["/api/prompts", { q: debouncedSearchQuery, category: selectedCategory, sortBy }]);
      
      queryClient.setQueryData<{ likedPromptIds: string[] }>(["/api/prompts/liked", sessionId], (old) => ({
        likedPromptIds: (old?.likedPromptIds || []).filter(id => id !== promptId)
      }));
      
      queryClient.setQueryData<PromptsResponse>(["/api/prompts", { q: debouncedSearchQuery, category: selectedCategory, sortBy }], (old) => {
        if (!old) return old;
        return {
          ...old,
          prompts: old.prompts.map(p => 
            p.id === promptId ? { ...p, likesCount: Math.max(0, (p.likesCount || 0) - 1) } : p
          )
        };
      });
      
      return { previousLiked, previousPrompts };
    },
    onError: (_err, _promptId, context) => {
      if (context?.previousLiked) {
        queryClient.setQueryData(["/api/prompts/liked", sessionId], context.previousLiked);
      }
      if (context?.previousPrompts) {
        queryClient.setQueryData(["/api/prompts", { q: debouncedSearchQuery, category: selectedCategory, sortBy }], context.previousPrompts);
      }
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إلغاء الإعجاب",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/liked"] });
    },
  });

  const handleLike = (promptId: string) => {
    likeMutation.mutate(promptId);
  };

  const handleUnlike = (promptId: string) => {
    unlikeMutation.mutate(promptId);
  };

  const handleViewPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setGeneratedImage(null);
    setDetailOpen(true);
  };

  const handleGenerateImage = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setGeneratedImage(null);
    setDetailOpen(true);
    generateImageMutation.mutate(prompt.id);
  };

  const handleExplore = () => {
    promptsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const showEmptyState = !isLoading && prompts.length === 0 && !searchQuery && !selectedCategory;
  const showNoResults = !isLoading && prompts.length === 0 && (searchQuery || selectedCategory);

  const currentSortOption = sortOptions.find((o) => o.value === sortBy) || sortOptions[0];

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddPrompt={() => setAddDialogOpen(true)}
      />

      <Hero
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExplore={handleExplore}
      />

      <div ref={promptsRef}>
        <CategoryFilter
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        <main className="container mx-auto px-4 py-8">
          {showEmptyState ? (
            <EmptyState
              type="no-prompts"
              onAddPrompt={() => setAddDialogOpen(true)}
            />
          ) : showNoResults ? (
            <EmptyState
              type="no-results"
              searchQuery={searchQuery}
              onAddPrompt={() => setAddDialogOpen(true)}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <h2 className="text-2xl font-bold">
                  {selectedCategory
                    ? `أوامر ${selectedCategory}`
                    : "جميع الأوامر"}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm">
                    {prompts.length} أمر
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-sort">
                        <currentSortOption.icon className="h-4 w-4 ml-2" />
                        {currentSortOption.label}
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {sortOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => setSortBy(option.value)}
                          className={sortBy === option.value ? "bg-accent" : ""}
                          data-testid={`sort-option-${option.value}`}
                        >
                          <option.icon className="h-4 w-4 ml-2" />
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <PromptGrid
                prompts={prompts}
                isLoading={isLoading}
                isFetching={isFetching}
                onGenerate={handleGenerateImage}
                onView={handleViewPrompt}
                likedPromptIds={likedPromptIds}
                onLike={handleLike}
                onUnlike={handleUnlike}
              />
            </>
          )}
        </main>
      </div>

      <PromptDetail
        prompt={selectedPrompt}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onGenerate={handleGenerateImage}
        isGenerating={generateImageMutation.isPending}
        generatedImage={generatedImage}
        isLiked={selectedPrompt ? likedPromptIds.includes(selectedPrompt.id) : false}
        onLike={handleLike}
        onUnlike={handleUnlike}
      />

      <AddPromptDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={(data) => addPromptMutation.mutate(data)}
        isSubmitting={addPromptMutation.isPending}
      />
    </div>
  );
}
