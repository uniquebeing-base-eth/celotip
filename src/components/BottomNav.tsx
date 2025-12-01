import { Home, Trophy, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-elevated backdrop-blur-sm bg-opacity-95">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-around py-3">
          <NavLink
            to="/"
            end
            className="flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-all"
            activeClassName="text-primary bg-secondary/50"
          >
            {({ isActive }) => (
              <>
                <Home className={`h-5 w-5 ${isActive ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">Home</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/leaderboard"
            className="flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-all"
            activeClassName="text-primary bg-secondary/50"
          >
            {({ isActive }) => (
              <>
                <Trophy className={`h-5 w-5 ${isActive ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">Leaderboard</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/settings"
            className="flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-all"
            activeClassName="text-primary bg-secondary/50"
          >
            {({ isActive }) => (
              <>
                <Settings className={`h-5 w-5 ${isActive ? 'rotate-90' : ''} transition-transform`} />
                <span className="text-xs font-medium">Settings</span>
              </>
            )}
          </NavLink>
        </div>
      </div>
    </nav>
  );
};
