import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { CastCard } from "@/components/CastCard";
import { useTrendingCasts } from "@/hooks/useTrendingCasts";
import { Skeleton } from "@/components/ui/skeleton";

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: casts, isLoading, error } = useTrendingCasts();
  
  const filteredCasts = casts?.filter(
    (cast) =>
      cast.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cast.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header onSearch={setSearchQuery} />
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1">Trending Casts</h2>
          <p className="text-sm text-muted-foreground">Casts receiving the most tips right now</p>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-start gap-3 mb-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">Error loading casts. Please try again.</p>
            </div>
          ) : filteredCasts.length > 0 ? (
            filteredCasts.map((cast) => <CastCard key={cast.id} cast={cast} />)
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No casts found matching your search.</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
