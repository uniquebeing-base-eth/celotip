import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { CastCard } from "@/components/CastCard";

// Dummy data
const TRENDING_CASTS = [
  {
    id: "1",
    author: "vitalik",
    content: "Just deployed a new smart contract for decentralized governance. Looking forward to seeing how the community uses it! 🚀",
    totalTips: 125.50,
    topTippers: ["alice", "bob", "charlie", "dave", "eve", "frank"],
  },
  {
    id: "2",
    author: "pmarca",
    content: "The future of crypto is mobile-first. If your dApp doesn't work seamlessly on phones, you're missing 90% of potential users.",
    totalTips: 98.25,
    topTippers: ["grace", "heidi", "ivan", "judy"],
  },
  {
    id: "3",
    author: "balajis",
    content: "Network states are the future. Build online communities first, then acquire land and diplomatic recognition.",
    totalTips: 87.75,
    topTippers: ["mallory", "oscar", "peggy", "romeo", "sybil"],
  },
  {
    id: "4",
    author: "naval",
    content: "Wealth is assets that earn while you sleep. Money is how we transfer time and wealth. Code is leverage.",
    totalTips: 76.50,
    topTippers: ["trent", "ursula", "victor"],
  },
  {
    id: "5",
    author: "dwr",
    content: "Farcaster is growing faster than I ever imagined. The community here is incredible. Let's keep building! 💜",
    totalTips: 64.00,
    topTippers: ["wendy", "xavier", "yvonne", "zelda", "adam", "brenda"],
  },
];

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredCasts = TRENDING_CASTS.filter(
    (cast) =>
      cast.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cast.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header username="Creator" onSearch={setSearchQuery} />
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1">Trending Casts</h2>
          <p className="text-sm text-muted-foreground">Casts receiving the most tips right now</p>
        </div>

        <div className="space-y-4">
          {filteredCasts.length > 0 ? (
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
