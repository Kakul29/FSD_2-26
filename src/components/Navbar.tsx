import React from 'react';
import { Camera, Search, User, Heart, Sparkles, LogOut, CheckCircle2 } from 'lucide-react';
import { IUser } from '../types';

interface NavbarProps {
  currentUser: IUser | null;
  activeTab: 'home' | 'scan' | 'search' | 'profile' | 'favorites';
  setActiveTab: (tab: 'home' | 'scan' | 'search' | 'profile' | 'favorites') => void;
  onOpenScanner: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenFavorites: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenScanner,
  onOpenAuth,
  onLogout,
  onOpenProfile,
  onOpenFavorites,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/90 backdrop-blur-md border-b border-stone-200/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand Wordmark (Single text element with icon) */}
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 text-left group whitespace-nowrap shrink-0 focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-stone-50 flex items-center justify-center font-bold shadow-sm group-hover:bg-emerald-700 transition-colors">
              <span className="font-display text-lg tracking-tight">LL</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl tracking-tight text-stone-900 group-hover:text-emerald-900 transition-colors">
                LabelLens
              </span>
            </div>
          </button>

          {/* Zone 2: 4-5 Concise Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
            <button
              onClick={() => {
                setActiveTab('home');
                onOpenScanner();
              }}
              className="flex items-center gap-1.5 hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              <Camera className="w-4 h-4 text-emerald-700" />
              <span>Scan Barcode</span>
            </button>
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-1.5 hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              <Search className="w-4 h-4 text-stone-500" />
              <span>Find Healthy Food</span>
            </button>
            <button
              onClick={onOpenProfile}
              className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Food Profile
            </button>
            <button
              onClick={onOpenFavorites}
              className="flex items-center gap-1.5 hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Favorites</span>
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-stone-200 bg-white hover:border-emerald-600/50 transition-all text-xs font-medium text-stone-800 shadow-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase">
                    {currentUser.name.charAt(0)}
                  </div>
                  <span className="max-w-[120px] truncate">{currentUser.name}</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-stone-200 shadow-lg py-1.5 z-50 text-sm text-stone-700">
                    <div className="px-3.5 py-2 border-b border-stone-100">
                      <p className="font-semibold text-stone-900 truncate">{currentUser.name}</p>
                      <p className="text-xs text-stone-500 truncate">{currentUser.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-stone-50 flex items-center gap-2 text-stone-700"
                    >
                      <User className="w-4 h-4 text-emerald-700" />
                      <span>Edit Dietary Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenFavorites();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-stone-50 flex items-center gap-2 text-stone-700"
                    >
                      <Heart className="w-4 h-4 text-rose-500" />
                      <span>Saved Favorites</span>
                    </button>
                    <div className="border-t border-stone-100 my-1" />
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
