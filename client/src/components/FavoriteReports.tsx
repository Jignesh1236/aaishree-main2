import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface FavoriteReportsProps {
  reportId: string;
  size?: "sm" | "default";
}

export default function FavoriteReports({ reportId, size = "default" }: FavoriteReportsProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('adsc-favorites') || '[]');
    setIsFavorite(favorites.includes(reportId));
  }, [reportId]);

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('adsc-favorites') || '[]');
    
    if (isFavorite) {
      const updated = favorites.filter((id: string) => id !== reportId);
      localStorage.setItem('adsc-favorites', JSON.stringify(updated));
      setIsFavorite(false);
      toast({
        title: "Removed from Favorites",
        description: "Report removed from your favorites",
      });
    } else {
      favorites.push(reportId);
      localStorage.setItem('adsc-favorites', JSON.stringify(favorites));
      setIsFavorite(true);
      toast({
        title: "Added to Favorites",
        description: "Report added to your favorites",
      });
    }
  };

  return (
    <Button
      variant={isFavorite ? "default" : "outline"}
      size={size}
      onClick={toggleFavorite}
      className="gap-2"
    >
      <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
      {isFavorite ? 'Favorited' : 'Favorite'}
    </Button>
  );
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('adsc-favorites') || '[]');
    setFavorites(saved);
  }, []);

  return favorites;
}
