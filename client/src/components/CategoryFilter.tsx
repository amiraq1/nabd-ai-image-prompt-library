import { Mountain, Palette, PenTool, Users, Sparkles, Building, Shapes, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { categories, type CategoryId } from "@shared/schema";

const iconMap = {
  Mountain,
  Palette,
  PenTool,
  Users,
  Sparkles,
  Building,
  Shapes,
  User,
};

interface CategoryFilterProps {
  selectedCategory: CategoryId | null;
  onCategoryChange: (category: CategoryId | null) => void;
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border py-3">
      <div className="container mx-auto px-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange(null)}
              className="shrink-0 toggle-elevate"
              data-testid="button-category-all"
            >
              <Sparkles className="h-4 w-4 ml-2" />
              الكل
            </Button>
            {categories.map((category) => {
              const IconComponent = iconMap[category.icon as keyof typeof iconMap];
              const isSelected = selectedCategory === category.id;
              return (
                <Button
                  key={category.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => onCategoryChange(category.id)}
                  className="shrink-0 toggle-elevate"
                  data-testid={`button-category-${category.id}`}
                >
                  {IconComponent && <IconComponent className="h-4 w-4 ml-2" />}
                  {category.nameAr}
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
