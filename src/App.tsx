import React, { useState, useEffect } from 'react';
import {
  Camera,
  Search,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Heart,
  ChevronRight,
  Clock,
  SlidersHorizontal,
  RefreshCw,
  AlertCircle,
  Database,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { ScannerModal } from './components/ScannerModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ProfileModal } from './components/ProfileModal';
import { AuthModal } from './components/AuthModal';
import { FavoritesModal } from './components/FavoritesModal';
import { api, getStoredToken, clearStoredToken } from './services/api';
import { IFormattedProduct, IUser, IHistoryItem } from './types';

// Curated quick craving suggestions
const CRAVING_SUGGESTIONS = [
  'Maggi',
  'nachos',
  'ramen',
  'chocolate',
  'biscuits',
  'Greek yogurt',
  'millet noodles',
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'search' | 'profile' | 'favorites'>('home');

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<IFormattedProduct | null>(null);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'lower_sugar' | 'lower_sodium' | 'higher_protein' | 'higher_fibre' | 'less_processed'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<IFormattedProduct[]>([]);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Recently Viewed
  const [recentProducts, setRecentProducts] = useState<IHistoryItem[]>([]);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // System Health Status
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // Load user session and health check on mount
  useEffect(() => {
    async function initApp() {
      const token = getStoredToken();
      if (token) {
        try {
          const res = await api.getMe();
          setCurrentUser(res.user);
          if (res.user.history) {
            setRecentProducts(res.user.history);
          }
        } catch (err) {
          clearStoredToken();
          setCurrentUser(null);
        }
      }

      // Check backend health
      try {
        const health = await api.checkHealth();
        setHealthStatus(health);
      } catch (err) {
        console.warn('Backend health probe failed:', err);
      }
    }

    initApp();
  }, []);

  // Barcode Lookup Handler
  const handleBarcodeSelect = async (barcode: string) => {
    try {
      setIsLoadingProduct(true);
      setIsScannerOpen(false);
      const res = await api.getProductByBarcode(barcode);
      setSelectedProduct(res.product);

      // Refresh recent items
      setRecentProducts((prev) => {
        const filtered = prev.filter((p) => p.barcode !== barcode);
        return [
          {
            barcode: res.product.barcode,
            name: res.product.name,
            brand: res.product.brand,
            image: res.product.image,
            healthScore: res.product.nutritionAnalysis.healthScore,
            viewedAt: new Date().toISOString(),
          },
          ...filtered,
        ].slice(0, 8);
      });
    } catch (err: any) {
      setLookupError(err.message || 'Product not found. Please try another barcode or search by name.');
      setTimeout(() => setLookupError(null), 5000);
    } finally {
      setIsLoadingProduct(false);
    }
  };

  // Search handler
  const handleSearch = async (e?: React.FormEvent, customQuery?: string, customFilter?: typeof activeFilter) => {
    if (e) e.preventDefault();
    const queryToUse = customQuery !== undefined ? customQuery : searchQuery;
    const filterToUse = customFilter !== undefined ? customFilter : activeFilter;

    if (!queryToUse.trim()) return;

    try {
      setIsSearching(true);
      setSearchSubmitted(true);
      setSearchError(null);
      const data = await api.searchProducts(queryToUse, filterToUse);
      setSearchResults(data.results);
    } catch (err: any) {
      setSearchError(err.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Re-run search if filter tab changes while results are displayed
  const handleFilterChange = (filter: typeof activeFilter) => {
    setActiveFilter(filter);
    if (searchSubmitted && searchQuery.trim()) {
      handleSearch(undefined, searchQuery, filter);
    }
  };

  const handleLogout = () => {
    clearStoredToken();
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 flex flex-col selection:bg-emerald-200">
      {/* Navigation */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {lookupError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{lookupError}</span>
            </div>
            <button
              onClick={() => setLookupError(null)}
              className="text-rose-500 hover:text-rose-800 text-xs font-semibold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* HERO SECTION */}
        <section className="relative rounded-3xl bg-stone-900 text-stone-50 overflow-hidden shadow-xl border border-stone-800">
          <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
            <img
              src="/src/assets/images/hero_food_scanner_1792084041683.jpg"
              alt="Wholesome food ingredients and packaged foods"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-900/90 to-stone-900/60 z-1" />

          <div className="relative z-10 p-8 sm:p-12 lg:p-16 max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800/80">
              <Sparkles className="w-3.5 h-3.5" />
              <span>LabelLens · Know what&apos;s in your food</span>
            </div>

            <h1 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-tight text-balance">
              Instant Packaged Food Clarity &amp; Safer Choices.
            </h1>

            <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              Scan any packaged food barcode to reveal transparent health scores, uncover hidden sugars and ultra-processing, detect your personal allergens, and discover healthier Indian &amp; international alternatives.
            </p>

            {/* Two Primary Action Cards Strip */}
            <div className="pt-3 flex flex-wrap gap-4">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 group cursor-pointer"
              >
                <Camera className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
                <span>Scan a Product Barcode</span>
                <ArrowRight className="w-4 h-4 text-emerald-200" />
              </button>

              <button
                onClick={() => {
                  const searchEl = document.getElementById('search-food-section');
                  searchEl?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl border border-white/20 backdrop-blur-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Search className="w-4 h-4 text-stone-300" />
                <span>Explore Healthy Alternatives</span>
              </button>
            </div>
          </div>
        </section>

        {/* PERSONAL FOOD PROFILE PROMO BANNER */}
        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-amber-950">
                {currentUser
                  ? `Personalized for ${currentUser.name}: ${
                      currentUser.profile.allergies.length > 0
                        ? `${currentUser.profile.allergies.length} Saved Allergies Active`
                        : 'No allergies configured yet'
                    }`
                  : 'Configure Your Personal Food & Allergy Profile'}
              </h3>
              <p className="text-xs text-amber-800/90 mt-0.5">
                {currentUser
                  ? 'All food labels and alternative recommendations are actively vetted against your profile.'
                  : 'Add your allergies (peanuts, milk, wheat, etc.), dietary preferences (veg, Jain), and sugar/sodium targets for instant live warnings.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (currentUser) setIsProfileOpen(true);
              else setIsAuthOpen(true);
            }}
            className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap self-start sm:self-center shrink-0"
          >
            {currentUser ? 'Update Preferences' : 'Set Up Profile'}
          </button>
        </div>

        {/* PRIMARY ACTION B: FIND HEALTHY FOOD */}
        <section id="search-food-section" className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wide">
              <Search className="w-4 h-4 text-emerald-700" />
              <span>Primary Action B · Craving &amp; Category Search</span>
            </div>
            <h2 className="font-display font-bold text-2xl text-stone-900 tracking-tight">
              Find Healthy Food for Any Craving
            </h2>
            <p className="text-xs text-stone-500 max-w-xl">
              Search actual packaged products by craving (e.g. nachos, ramen, Maggi, chocolate, biscuits) to compare verified nutrition and discover cleaner options.
            </p>
          </div>

          {/* Search Box */}
          <form onSubmit={(e) => handleSearch(e)} className="relative max-w-3xl">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food craving e.g. 'nachos', 'ramen', 'Maggi', 'chocolate'..."
                className="w-full pl-12 pr-28 py-3.5 text-sm bg-white border border-stone-300 rounded-2xl shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-stone-900 placeholder:text-stone-400"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-2 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Search</span>}
              </button>
            </div>
          </form>

          {/* Craving Suggestion Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <span className="font-medium text-stone-700">Popular Cravings:</span>
            {CRAVING_SUGGESTIONS.map((item) => (
              <button
                key={item}
                onClick={() => {
                  setSearchQuery(item);
                  handleSearch(undefined, item);
                }}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 rounded-lg transition-colors cursor-pointer text-xs"
              >
                {item}
              </button>
            ))}
          </div>

          {/* Interactive Filter Controls */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100/80 rounded-xl border border-stone-200 max-w-3xl">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Products
            </button>
            <button
              onClick={() => handleFilterChange('lower_sugar')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'lower_sugar'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Lower Sugar
            </button>
            <button
              onClick={() => handleFilterChange('lower_sodium')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'lower_sodium'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Lower Sodium
            </button>
            <button
              onClick={() => handleFilterChange('higher_protein')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'higher_protein'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Higher Protein
            </button>
            <button
              onClick={() => handleFilterChange('higher_fibre')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'higher_fibre'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Higher Fibre
            </button>
            <button
              onClick={() => handleFilterChange('less_processed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeFilter === 'less_processed'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Less Processed
            </button>
          </div>

          {/* Search Results Display */}
          {isSearching ? (
            <div className="p-12 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-800" />
              <p>Searching Open Food Facts &amp; verified Indian packaged food database...</p>
            </div>
          ) : searchSubmitted && searchResults.length > 0 ? (
            <div className="space-y-6 pt-2">
              {/* REQUIREMENT 3: Highest-ranked suitable option first */}
              {searchResults[0] && (
                <div className="p-6 rounded-2xl bg-white border-2 border-emerald-600 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-emerald-800 text-stone-50 text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-bl-xl shadow-xs">
                    #1 Top Ranked Choice
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-stone-50 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center p-2">
                        <img
                          src={searchResults[0].image}
                          alt={searchResults[0].name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                          <span className="font-semibold text-emerald-900">{searchResults[0].brand}</span>
                          <span>·</span>
                          <span>{searchResults[0].category}</span>
                        </div>
                        <h3 className="font-display font-bold text-lg text-stone-900">
                          {searchResults[0].name}
                        </h3>
                        <p className="text-xs text-emerald-800 font-medium">
                          {searchResults[0].nutritionAnalysis.positiveAttributes.slice(0, 2).join(' · ') ||
                            'Clean ingredient profile with balanced macronutrients'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-stone-400 uppercase block font-semibold">Health Score</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-display font-extrabold text-3xl tabular-nums text-emerald-900">
                            {searchResults[0].nutritionAnalysis.healthScore}
                          </span>
                          <span className="text-xs text-stone-400">/100</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedProduct(searchResults[0])}
                        className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Full Analysis</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Followed by five other alternatives (Grid of remaining up to 5 items) */}
              {searchResults.length > 1 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
                    Additional Options in this Category ({Math.min(5, searchResults.length - 1)})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.slice(1, 6).map((item, idx) => (
                      <div
                        key={item.barcode}
                        className="p-4 bg-white rounded-2xl border border-stone-200 hover:border-emerald-600/50 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-lg bg-stone-50 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                            <img
                              src={item.image}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] text-stone-500 font-medium truncate">{item.brand}</p>
                            <h5 className="font-semibold text-xs text-stone-900 line-clamp-1">{item.name}</h5>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-stone-500">
                              <span>Score:</span>
                              <span className="font-mono font-bold text-emerald-800 tabular-nums">
                                {item.nutritionAnalysis.healthScore}/100
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                          <span className="text-[11px] text-stone-500 truncate max-w-[140px]">
                            {item.availableInIndia ? 'In India' : 'International'}
                          </span>
                          <button
                            onClick={() => setSelectedProduct(item)}
                            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : searchSubmitted ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-600 space-y-1">
              <p className="font-semibold text-sm">No products found matching &quot;{searchQuery}&quot;</p>
              <p className="text-xs text-stone-400">
                Try searching for common staples like &quot;ramen&quot;, &quot;nachos&quot;, &quot;maggi&quot;, &quot;biscuits&quot;, or &quot;chocolate&quot;.
              </p>
            </div>
          ) : null}
        </section>

        {/* RECENTLY VIEWED PRODUCTS */}
        {recentProducts.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-500" />
                <h3 className="font-display font-bold text-base text-stone-900">Recently Viewed Food Items</h3>
              </div>
              <span className="text-xs text-stone-500">{recentProducts.length} items</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {recentProducts.map((item) => (
                <button
                  key={item.barcode}
                  onClick={() => handleBarcodeSelect(item.barcode)}
                  className="p-3 bg-white rounded-xl border border-stone-200 hover:border-emerald-600/50 hover:shadow-xs transition-all text-left flex flex-col justify-between group cursor-pointer"
                >
                  <div className="w-full aspect-square rounded-lg bg-stone-50 border border-stone-100 overflow-hidden mb-2 flex items-center justify-center p-1">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <span className="text-xs font-bold text-stone-400">LL</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-500 font-medium truncate">{item.brand}</p>
                    <p className="text-xs font-semibold text-stone-900 line-clamp-1 group-hover:text-emerald-900">
                      {item.name}
                    </p>
                    {item.healthScore !== undefined && (
                      <p className="text-[11px] font-mono font-bold text-emerald-800 mt-1 tabular-nums">
                        {item.healthScore}/100
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-16 border-t border-stone-200 bg-white py-8 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-stone-800">LabelLens</span>
            <span>·</span>
            <span>Know what&apos;s in your food</span>
            <span>·</span>
            <span>College FED Project</span>
          </div>

          {/* System & MongoDB Health Status Indicator */}
          {healthStatus && (
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  {healthStatus.database.connected ? 'MongoDB Live' : 'Mongoose In-Memory Mode'}
                </span>
              </span>
              <span>·</span>
              <span>Open Food Facts: {healthStatus.externalServices.openFoodFacts.status}</span>
            </div>
          )}
        </div>
      </footer>

      {/* ALL MODALS */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeSelect}
      />

      <ProductDetailModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onSelectAlternative={handleBarcodeSelect}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onProductFavorited={async () => {
          if (currentUser) {
            const res = await api.getMe();
            setCurrentUser(res.user);
          }
        }}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(user) => setCurrentUser(user)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          if (user.history) setRecentProducts(user.history);
        }}
      />

      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        currentUser={currentUser}
        onSelectProduct={handleBarcodeSelect}
        onFavoritesChanged={async () => {
          if (currentUser) {
            const res = await api.getMe();
            setCurrentUser(res.user);
          }
        }}
      />
    </div>
  );
}
