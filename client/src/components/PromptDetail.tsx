import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Wand2, Copy, Check, Download, Loader2, Heart, Share2, Image as ImageIcon } from "lucide-react";
import { SiX, SiFacebook, SiWhatsapp, SiPinterest } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categories, type Prompt, type GeneratedImage } from "@shared/schema";

interface PromptDetailProps {
  prompt: Prompt | null;
  open: boolean;
  onClose: () => void;
  onGenerate: (prompt: Prompt) => void;
  isGenerating: boolean;
  generatedImage: string | null;
  isLiked?: boolean;
  onLike?: (promptId: string) => void;
  onUnlike?: (promptId: string) => void;
}

export function PromptDetail({
  prompt,
  open,
  onClose,
  onGenerate,
  isGenerating,
  generatedImage,
  isLiked = false,
  onLike,
  onUnlike,
}: PromptDetailProps) {
  const [copied, setCopied] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);

  const { data: galleryImages = [] } = useQuery<GeneratedImage[]>({
    queryKey: ["/api/prompts", prompt?.id, "images"],
    enabled: !!prompt?.id && open,
  });

  if (!prompt) return null;

  const category = categories.find((c) => c.id === prompt.category);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const imageToDownload = selectedGalleryImage || generatedImage || prompt.generatedImageUrl;
    if (imageToDownload) {
      const link = document.createElement("a");
      link.href = imageToDownload;
      link.download = `${prompt.title.replace(/\s+/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleLikeClick = () => {
    if (isLiked) {
      onUnlike?.(prompt.id);
    } else {
      onLike?.(prompt.id);
    }
  };

  const handleShare = (platform: string) => {
    const imageUrl = selectedGalleryImage || generatedImage || prompt.generatedImageUrl;
    const shareText = `${prompt.title} - ${prompt.description}`;
    const currentUrl = window.location.href;
    
    let shareUrl = "";
    
    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}&quote=${encodeURIComponent(shareText)}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " " + currentUrl)}`;
        break;
      case "pinterest":
        shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(currentUrl)}&description=${encodeURIComponent(shareText)}${imageUrl ? `&media=${encodeURIComponent(imageUrl)}` : ''}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  const placeholderGradients = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-orange-500 to-amber-500",
    "from-pink-500 to-rose-500",
  ];
  const gradientIndex = prompt.id.charCodeAt(0) % placeholderGradients.length;
  const gradient = placeholderGradients[gradientIndex];

  const displayImage = selectedGalleryImage || generatedImage || prompt.generatedImageUrl;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-3/5 relative">
            <div className="aspect-square lg:aspect-auto lg:h-full min-h-[300px] relative overflow-hidden rounded-t-lg lg:rounded-l-lg lg:rounded-tr-none">
              {isGenerating ? (
                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center`}>
                  <Loader2 className="h-16 w-16 text-white animate-spin mb-4" />
                  <p className="text-white font-medium">جاري توليد الصورة...</p>
                </div>
              ) : displayImage ? (
                <img
                  src={displayImage}
                  alt={prompt.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <Wand2 className="h-20 w-20 text-white/50" />
                </div>
              )}

              {displayImage && !isGenerating && (
                <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-white/10 backdrop-blur-md border-white/20 text-white"
                    onClick={handleDownload}
                    data-testid="button-download-image"
                  >
                    <Download className="h-4 w-4 ml-2" />
                    تحميل
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:w-2/5 p-6 flex flex-col">
            <DialogHeader className="mb-4">
              <div className="flex items-start justify-between gap-2">
                <DialogTitle className="text-2xl font-bold text-right">
                  {prompt.title}
                </DialogTitle>
                <Badge variant="secondary">{category?.nameAr}</Badge>
              </div>
            </DialogHeader>

            <Tabs defaultValue="details" className="flex-1">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1" data-testid="tab-details">
                  التفاصيل
                </TabsTrigger>
                <TabsTrigger value="gallery" className="flex-1" data-testid="tab-gallery">
                  <ImageIcon className="h-4 w-4 ml-1" />
                  المعرض ({galleryImages.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 space-y-4 mt-4">
                <div>
                  <h4 className="font-semibold mb-2 text-muted-foreground">الأمر</h4>
                  <div className="bg-muted rounded-lg p-4 relative">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap pl-8">
                      {prompt.promptText}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 left-2"
                      onClick={handleCopy}
                      data-testid="button-copy-prompt"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-muted-foreground">الوصف</h4>
                  <p className="text-sm leading-relaxed">{prompt.description}</p>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>الاستخدام: {prompt.usageCount}</span>
                    <span className="flex items-center gap-1">
                      <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      {prompt.likesCount || 0}
                    </span>
                  </div>
                  <Button
                    variant={isLiked ? "default" : "outline"}
                    size="sm"
                    onClick={handleLikeClick}
                    className={isLiked ? 'bg-red-500 text-white' : ''}
                    data-testid="button-like-prompt"
                  >
                    <Heart className={`h-4 w-4 ml-1 ${isLiked ? 'fill-current' : ''}`} />
                    {isLiked ? 'أعجبني' : 'إعجاب'}
                  </Button>
                </div>

                {displayImage && (
                  <div>
                    <h4 className="font-semibold mb-2 text-muted-foreground">مشاركة</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleShare("twitter")}
                        data-testid="button-share-twitter"
                      >
                        <SiX className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleShare("facebook")}
                        data-testid="button-share-facebook"
                      >
                        <SiFacebook className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleShare("whatsapp")}
                        data-testid="button-share-whatsapp"
                      >
                        <SiWhatsapp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleShare("pinterest")}
                        data-testid="button-share-pinterest"
                      >
                        <SiPinterest className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="gallery" className="flex-1 mt-4">
                {galleryImages.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <div className="grid grid-cols-2 gap-2">
                      {galleryImages.map((image) => (
                        <div
                          key={image.id}
                          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            selectedGalleryImage === image.imageUrl
                              ? 'border-primary'
                              : 'border-transparent'
                          }`}
                          onClick={() => setSelectedGalleryImage(image.imageUrl)}
                          data-testid={`gallery-image-${image.id}`}
                        >
                          <img
                            src={image.imageUrl}
                            alt={`Generated from ${prompt.title}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                    <p>لا توجد صور مولدة بعد</p>
                    <p className="text-sm">اضغط على "توليد صورة" لإنشاء صورة جديدة</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-6 space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => onGenerate(prompt)}
                disabled={isGenerating}
                data-testid="button-generate-image"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                    جاري التوليد...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5 ml-2" />
                    توليد صورة جديدة
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
