import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { CastCard } from "@/components/CastCard";

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const casts: any[] = [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header onSearch={setSearchQuery} />
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1">Trending Casts</h2>
          <p className="text-sm text-muted-foreground">Casts receiving the most tips right now</p>
        </div>

        <div className="space-y-4">
          {casts.length > 0 ? (
            casts.map((cast) => <CastCard key={cast.id} cast={cast} />)
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No trending casts yet. Coming soon!</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;
