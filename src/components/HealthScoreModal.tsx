import React from 'react';
import { X, Info, PlusCircle, MinusCircle, ShieldCheck } from 'lucide-react';
import { INutritionAnalysis } from '../types';

interface HealthScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: INutritionAnalysis;
  productName: string;
}

export const HealthScoreModal: React.FC<HealthScoreModalProps> = ({
  isOpen,
  onClose,
  analysis,
  productName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[#FBF9F5] rounded-2xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-800" />
            <h2 className="font-display font-bold text-lg text-stone-900">
              Health Score Ledger
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Big Score Summary */}
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-stone-200">
            <div>
              <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold">
                Transparent Health Score
              </p>
              <h3 className="text-sm font-semibold text-stone-800 line-clamp-1">{productName}</h3>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display font-bold text-3xl tabular-nums text-emerald-900">
                {analysis.healthScore}
              </span>
              <span className="text-xs text-stone-500 font-medium">/ 100</span>
            </div>
          </div>

          {/* Formula Explanation */}
          <div className="text-xs text-stone-600 bg-stone-100/80 p-3.5 rounded-lg border border-stone-200 space-y-1">
            <p className="font-semibold text-stone-800">Formula Principles:</p>
            <p className="font-mono text-[11px] text-stone-700">{analysis.calculationFormula}</p>
            <p className="text-stone-500 pt-1">
              Calculated using FSSAI packaged food guidelines, Nutri-Score nutrient density algorithms, and NOVA industrial processing penalties. No arbitrary marketing or subjective bias is included.
            </p>
          </div>

          {/* Itemized Points Breakdown Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
              Itemized Point Allocation
            </h4>
            <div className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white overflow-hidden">
              {analysis.scoreBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between p-3 text-xs gap-3">
                  <div className="flex items-start gap-2">
                    {item.type === 'positive' && (
                      <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    {item.type === 'negative' && (
                      <MinusCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    {item.type === 'neutral' && (
                      <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-stone-800">{item.label}</p>
                      <p className="text-stone-500 text-[11px] mt-0.5">{item.reason}</p>
                    </div>
                  </div>
                  <span
                    className={`font-mono font-bold tabular-nums shrink-0 ${
                      item.points > 0
                        ? 'text-emerald-700'
                        : item.points < 0
                        ? 'text-rose-600'
                        : 'text-stone-700'
                    }`}
                  >
                    {item.points > 0 ? `+${item.points}` : item.points}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Completeness Notice */}
          {analysis.missingDataNotes.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-semibold">Missing Nutritional Parameters:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                {analysis.missingDataNotes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
              <p className="text-[10px] text-amber-700 pt-1">
                When manufacturer data is unavailable, neutral assumptions are applied without false precision.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
