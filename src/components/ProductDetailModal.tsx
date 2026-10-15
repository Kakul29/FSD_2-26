import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  Heart,
  Sparkles,
  Info,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { IFormattedProduct, IAlternativesResponse, IUser } from '../types';
import { api } from '../services/api';
import { HealthScoreModal } from './HealthScoreModal';

interface ProductDetailModalProps {
  product: IFormattedProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectAlternative: (barcode: string) => void;
  currentUser: IUser | null;
  onOpenAuth: () => void;
  onProductFavorited?: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onSelectAlternative,
  currentUser,
  onOpenAuth,
  onProductFavorited,
}) => {
  const [showLedger, setShowLedger] = useState(false);
  const [alternativesData, setAlternativesData] = useState<IAlternativesResponse | null>(null);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteNotes, setFavoriteNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!product || !isOpen) return;

    setImageError(false);
    setAiInsights(null);

    // Check if in user favorites
    if (currentUser?.favorites) {
      const match = currentUser.favorites.find((f) => f.barcode === product.barcode);
      setIsFavorite(Boolean(match));
      setFavoriteNotes(match?.notes || '');
    } else {
      setIsFavorite(false);
    }

    // Fetch healthier alternatives
    async function loadAlternatives() {
      if (!product) return;
      try {
        setLoadingAlternatives(true);
        const data = await api.getAlternatives(product.barcode);
        setAlternativesData(data);
      } catch (err) {
        console.warn('Failed to load alternatives:', err);
      } finally {
        setLoadingAlternatives(false);
      }
    }

    loadAlternatives();
  }, [product, isOpen, currentUser]);

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!product) return;

    try {
      if (isFavorite) {
        await api.removeFavorite(product.barcode);
        setIsFavorite(false);
      } else {
        await api.addFavorite({
          barcode: product.barcode,
          name: product.name,
          brand: product.brand,
          image: product.image,
          healthScore: product.nutritionAnalysis.healthScore,
          notes: favoriteNotes,
        });
        setIsFavorite(true);
        setShowNotesInput(false);
      }
      onProductFavorited?.();
    } catch (err) {
      console.error('Favorite action failed:', err);
    }
  };

  const handleFetchAiInsights = async () => {
    if (!product) return;
    try {
      setLoadingAi(true);
      const res = await api.getAiInsights({
        productName: product.name,
        brand: product.brand,
        ingredientsText: product.ingredientsText,
        healthScore: product.nutritionAnalysis.healthScore,
        allergens: product.allergensTags,
      });
      if (res.available && res.insights) {
        setAiInsights(res.insights);
      } else {
        setAiInsights(
          'Gemini AI insights are running in offline mode. Review the verified FSSAI nutritional metrics, allergen alerts, and itemized ledger below.'
        );
      }
    } catch (err: any) {
      setAiInsights('Could not generate AI insights at this time: ' + err.message);
    } finally {
      setLoadingAi(false);
    }
  };

  if (!isOpen || !product) return null;

  const { nutritionAnalysis, allergenAnalysis, personalizedWarnings } = product;

  // Safe helper to extract nutrients
  const getNutrient = (key: string): string => {
    const val = product.nutrients[key] ?? product.nutrients[`${key}_100g`];
    if (val !== undefined && val !== null && !isNaN(Number(val))) {
      return `${Math.round(Number(val) * 10) / 10}`;
    }
    return '—';
  };

  const sodiumVal = product.nutrients.sodium ?? (product.nutrients.salt ? product.nutrients.salt / 2.5 : null);
  const sodiumDisplay = sodiumVal !== null ? `${Math.round(sodiumVal > 15 ? sodiumVal : sodiumVal * 1000)} mg` : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-[#FBF9F5] rounded-2xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2 text-xs text-stone-500 truncate">
            <span className="font-semibold text-stone-800">{product.brand}</span>
            <span>·</span>
            <span className="truncate">{product.category}</span>
            <span>·</span>
            <span className="font-mono tabular-nums">{product.barcode}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg border transition-colors ${
                isFavorite
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-50'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Product Overview Section */}
          <div className="flex flex-col sm:flex-row gap-6 items-start bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            {/* Image Box */}
            <div className="w-full sm:w-36 h-36 rounded-xl bg-stone-100 flex items-center justify-center overflow-hidden border border-stone-200 shrink-0">
              {!imageError && product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="text-center p-3 text-stone-400">
                  <Layers className="w-8 h-8 mx-auto mb-1 text-stone-300" />
                  <span className="text-[11px]">No Photo Available</span>
                </div>
              )}
            </div>

            {/* Product Meta & Score */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span className="font-semibold text-emerald-800 uppercase tracking-wide">
                  {product.brand}
                </span>
                <span>·</span>
                <span>{product.availableInIndia ? 'Available in India' : 'International Product'}</span>
                {product.isIndianBrand && (
                  <>
                    <span>·</span>
                    <span className="text-amber-800 font-medium">Indian Brand</span>
                  </>
                )}
              </div>

              <h2 className="font-display font-bold text-xl text-stone-900 leading-snug">
                {product.name}
              </h2>

              <p className="text-xs text-stone-500">
                Serving Size: <span className="font-semibold text-stone-700">{product.servingSize}</span>
              </p>

              {/* Health Score Pill-Free Card */}
              <div className="pt-2 flex items-center gap-4">
                <div className="flex items-baseline gap-1.5 p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-xs uppercase font-semibold text-stone-500">Health Score</span>
                  <span className="font-display font-extrabold text-2xl tabular-nums text-emerald-900 ml-1">
                    {nutritionAnalysis.healthScore}
                  </span>
                  <span className="text-xs text-stone-400 font-medium">/ 100</span>
                  <span className="text-xs font-bold text-emerald-700 ml-1">
                    Grade {nutritionAnalysis.healthScoreGrade}
                  </span>
                </div>

                <button
                  onClick={() => setShowLedger(true)}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-4 flex items-center gap-1"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>How is this calculated?</span>
                </button>
              </div>
            </div>
          </div>

          {/* REQUIREMENT 7: ALLERGEN ALERTS (Takes Priority Over Health Scores) */}
          {allergenAnalysis && (
            <div
              className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                allergenAnalysis.status === 'RED'
                  ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                  : allergenAnalysis.status === 'AMBER'
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                  : 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {allergenAnalysis.status === 'RED' && (
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  {allergenAnalysis.status === 'AMBER' && (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  {allergenAnalysis.status === 'GREEN' && (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  <h3 className="font-display font-bold text-sm tracking-tight">
                    Allergen Status: {allergenAnalysis.title}
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-white/70 border border-current/20">
                  {allergenAnalysis.status}
                </span>
              </div>

              {/* Matches List */}
              {allergenAnalysis.matches.length > 0 && (
                <div className="space-y-2 pt-1">
                  {allergenAnalysis.matches.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white/80 rounded-lg border border-rose-200 text-xs text-rose-900 space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span>Allergen: {m.allergen}</span>
                        <span className="text-[11px] font-mono text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                          {m.foundIn === 'ingredients_explicit'
                            ? 'Explicit Label Listing'
                            : m.foundIn === 'ingredients_synonym'
                            ? 'Inferred Synonym Match'
                            : m.foundIn === 'traces_warning'
                            ? 'Cross-Contamination Warning'
                            : 'Official Allergen Disclosure'}
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-800">{m.explanation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* General Allergen Warnings */}
              {allergenAnalysis.warnings.length > 0 && allergenAnalysis.matches.length === 0 && (
                <p className="text-xs">{allergenAnalysis.warnings.join(' ')}</p>
              )}

              {/* Mandatory Food Safety Disclaimer */}
              <p className="text-[10px] text-stone-600 border-t border-current/10 pt-2 leading-relaxed">
                {allergenAnalysis.disclaimer}
              </p>
            </div>
          )}

          {/* REQUIREMENT 8: PERSONALIZED NUTRITION WARNINGS */}
          {personalizedWarnings && personalizedWarnings.alerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
                Personalized Dietary & Health Warnings
              </h3>
              <div className="space-y-2">
                {personalizedWarnings.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      alert.type === 'danger'
                        ? 'bg-rose-50 border-rose-200 text-rose-950'
                        : alert.type === 'warning'
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : alert.type === 'positive'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-stone-100 border-stone-200 text-stone-800'
                    }`}
                  >
                    {alert.type === 'danger' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                    {alert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                    {alert.type === 'positive' && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                    {alert.type === 'info' && <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-semibold">{alert.title}</p>
                      <p className="text-[11px] mt-0.5 opacity-90">{alert.description}</p>
                      <p className="text-[10px] text-stone-500 mt-1 italic">
                        Standard: {alert.guidelineStandard}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nutrition Table (Per 100g) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-600">
              <h3 className="font-semibold text-stone-700 uppercase tracking-wide">
                Nutritional Profile (per 100g)
              </h3>
              <span>Serving: {product.servingSize}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <span className="text-[11px] text-stone-500 uppercase font-medium">Calories</span>
                <p className="font-display font-bold text-lg text-stone-900 mt-0.5 tabular-nums">
                  {getNutrient('energy-kcal')} <span className="text-xs font-normal text-stone-500">kcal</span>
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <span className="text-[11px] text-stone-500 uppercase font-medium">Sugars</span>
                <p className="font-display font-bold text-lg text-stone-900 mt-0.5 tabular-nums">
                  {getNutrient('sugars')} <span className="text-xs font-normal text-stone-500">g</span>
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <span className="text-[11px] text-stone-500 uppercase font-medium">Sodium</span>
                <p className="font-display font-bold text-lg text-stone-900 mt-0.5 tabular-nums">
                  {sodiumDisplay}
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <span className="text-[11px] text-stone-500 uppercase font-medium">Saturated Fat</span>
                <p className="font-display font-bold text-lg text-stone-900 mt-0.5 tabular-nums">
                  {getNutrient('saturated-fat')} <span className="text-xs font-normal text-stone-500">g</span>
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <span className="text-[11px] text-stone-500 uppercase font-medium">Protein</span>
                <p className="font-display font-bold text-lg text-stone-900 mt-0.5 tabular-nums">
                  {getNutrient('proteins')} <span className="text-xs font-normal text-stone-500">g</span>
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <span className="text-[11px] text-stone-500 uppercase font-medium">Dietary Fibre</span>
                <p className="font-display font-bold text-lg text-stone-900 mt-0.5 tabular-nums">
                  {getNutrient('fiber')} <span className="text-xs font-normal text-stone-500">g</span>
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <span className="text-[11px] text-stone-500 uppercase font-medium">Carbohydrates</span>
                <p className="font-display font-bold text-lg text-stone-900 mt-0.5 tabular-nums">
                  {getNutrient('carbohydrates')} <span className="text-xs font-normal text-stone-500">g</span>
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200">
                <span className="text-[11px] text-stone-500 uppercase font-medium">Total Fat</span>
                <p className="font-display font-bold text-lg text-stone-900 mt-0.5 tabular-nums">
                  {getNutrient('total-fat') !== '—' ? getNutrient('total-fat') : getNutrient('fat')} <span className="text-xs font-normal text-stone-500">g</span>
                </p>
              </div>
            </div>
          </div>

          {/* NOVA Classification & Positive vs Concerns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NOVA Box */}
            <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 uppercase">
                  Processing Classification
                </span>
                <span className="text-xs font-bold text-stone-800">
                  {nutritionAnalysis.novaGroup ? `NOVA ${nutritionAnalysis.novaGroup}` : 'NOVA Undetermined'}
                </span>
              </div>
              <p className="text-xs text-stone-700">{nutritionAnalysis.novaDescription}</p>
            </div>

            {/* Positive & Concerns Checklist */}
            <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
              <span className="text-xs font-semibold text-stone-500 uppercase">
                Attributes & Highlights
              </span>
              <div className="space-y-1 text-xs">
                {nutritionAnalysis.positiveAttributes.map((pos, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{pos}</span>
                  </div>
                ))}
                {nutritionAnalysis.potentialConcerns.map((con, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{con}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ingredients Text */}
          <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-1.5">
            <span className="text-xs font-semibold text-stone-500 uppercase">
              Ingredients Declaration
            </span>
            <p className="text-xs text-stone-700 leading-relaxed">
              {product.ingredientsText || 'Detailed ingredients list is not declared on this product record.'}
            </p>
          </div>

          {/* AI Insights (Gemini) */}
          <div className="p-4 bg-stone-100/70 rounded-xl border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-stone-800">
                  AI Food Scientist Analysis
                </span>
              </div>
              <button
                onClick={handleFetchAiInsights}
                disabled={loadingAi}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-4 disabled:opacity-50"
              >
                {loadingAi ? 'Analyzing Ingredients...' : aiInsights ? 'Regenerate Breakdown' : 'Explain Additives & Ingredients'}
              </button>
            </div>
            {aiInsights && (
              <div className="text-xs text-stone-700 whitespace-pre-line leading-relaxed pt-1 border-t border-stone-200">
                {aiInsights}
              </div>
            )}
          </div>

          {/* REQUIREMENT 5: HEALTHIER ALTERNATIVES SECTION */}
          <div className="space-y-3 pt-2">
            <div className="border-t border-stone-200 pt-4">
              <h3 className="font-display font-bold text-base text-stone-900">
                Healthier Alternatives in this Category
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {alternativesData?.explanation ||
                  'Discover verified alternatives in India with superior nutritional balance, matching your dietary preferences.'}
              </p>
            </div>

            {loadingAlternatives ? (
              <div className="p-8 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                <span>Evaluating healthier category matches & filtering allergens...</span>
              </div>
            ) : alternativesData && alternativesData.alternatives.length > 0 ? (
              <div className="space-y-3">
                {/* Top-ranked alternative first */}
                {alternativesData.alternatives.map((alt) => (
                  <div
                    key={alt.product.barcode}
                    className={`p-4 rounded-xl border transition-all hover:shadow-xs bg-white ${
                      alt.rank === 1 ? 'border-emerald-600/60 ring-1 ring-emerald-600/30' : 'border-stone-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Alternative Thumbnail */}
                        <div className="w-14 h-14 rounded-lg bg-stone-50 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                          <img
                            src={alt.product.image}
                            alt={alt.product.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-1"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {alt.rank === 1 && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                #1 Top Recommended Choice
                              </span>
                            )}
                            <span className="text-xs text-stone-500">{alt.product.brand}</span>
                          </div>
                          <h4 className="font-semibold text-xs text-stone-900 line-clamp-1">
                            {alt.product.name}
                          </h4>
                          <p className="text-[11px] text-emerald-800 font-medium">
                            {alt.whyBetter}
                          </p>
                        </div>
                      </div>

                      {/* Score & View Button */}
                      <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-stone-400 block uppercase">Health Score</span>
                          <span className="font-display font-bold text-lg tabular-nums text-emerald-900">
                            {alt.product.nutritionAnalysis.healthScore}
                          </span>
                          <span className="text-[10px] text-stone-400">/100</span>
                        </div>

                        <button
                          onClick={() => {
                            onSelectAlternative(alt.product.barcode);
                          }}
                          className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <span>Analyze</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Trade-offs & Deltas Strip */}
                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600">
                      <div className="flex items-center gap-3">
                        {alt.sodiumDelta !== null && (
                          <span className={alt.sodiumDelta < 0 ? 'text-emerald-700 font-medium' : ''}>
                            Sodium: {alt.sodiumDelta > 0 ? `+${alt.sodiumDelta}` : alt.sodiumDelta} mg
                          </span>
                        )}
                        {alt.sugarDelta !== null && (
                          <span className={alt.sugarDelta < 0 ? 'text-emerald-700 font-medium' : ''}>
                            Sugar: {alt.sugarDelta > 0 ? `+${alt.sugarDelta}` : alt.sugarDelta} g
                          </span>
                        )}
                        {alt.proteinDelta !== null && (
                          <span className={alt.proteinDelta > 0 ? 'text-emerald-700 font-medium' : ''}>
                            Protein: {alt.proteinDelta > 0 ? `+${alt.proteinDelta}` : alt.proteinDelta} g
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-500 italic">
                        Trade-off: {alt.tradeOffs[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-stone-100 rounded-xl text-xs text-stone-600 text-center">
                No verified healthier alternative currently verified in this specific food category.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Health Score Formula Ledger Modal */}
      <HealthScoreModal
        isOpen={showLedger}
        onClose={() => setShowLedger(false)}
        analysis={nutritionAnalysis}
        productName={product.name}
      />
    </div>
  );
};
