import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Plus, Activity, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddPrompt: () => void;
}

export function Header({ searchQuery, onSearchChange, onAddPrompt }: HeaderProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1" data-testid="link-home">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden font-bold text-xl sm:inline-block">نبض</span>
          </Link>

          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ابحث في الأوامر..."
                className="pr-10 w-full"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={onAddPrompt}
              className="hidden sm:flex"
              data-testid="button-add-prompt"
            >
              <Plus className="h-4 w-4 ml-2" />
              إضافة أمر
            </Button>
            
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ابحث في الأوامر..."
                className="pr-10 w-full"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                data-testid="input-search-mobile"
              />
            </div>
            <Button
              onClick={() => {
                onAddPrompt();
                setMobileMenuOpen(false);
              }}
              className="w-full"
              data-testid="button-add-prompt-mobile"
            >
              <Plus className="h-4 w-4 ml-2" />
              إضافة أمر جديد
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
