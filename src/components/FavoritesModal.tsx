import React, { useState } from 'react';
import { X, Heart, Trash2, ArrowRight, Scale, ChevronRight } from 'lucide-react';
import { IFavoriteItem, IUser } from '../types';
import { api } from '../services/api';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: IUser | null;
  onSelectProduct: (barcode: string) => void;
  onFavoritesChanged: () => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectProduct,
  onFavoritesChanged,
}) => {
  const [deletingBarcode, setDeletingBarcode] = useState<string | null>(null);

  if (!isOpen) return null;

  const favorites = currentUser?.favorites || [];

  const handleRemove = async (barcode: string) => {
    try {
      setDeletingBarcode(barcode);
      await api.removeFavorite(barcode);
      onFavoritesChanged();
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    } finally {
      setDeletingBarcode(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-[#FBF9F5] rounded-2xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            <h2 className="font-display font-bold text-lg text-stone-900">
              Saved Products ({favorites.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-6 overflow-y-auto space-y-3">
          {favorites.length === 0 ? (
            <div className="text-center py-12 text-stone-500 space-y-2">
              <Heart className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-sm font-semibold text-stone-700">No saved food items yet</p>
              <p className="text-xs text-stone-400 max-w-xs mx-auto">
                Scan or search for packaged food and click the heart icon on any product analysis card to save it here.
              </p>
            </div>
          ) : (
            favorites.map((item) => (
              <div
                key={item.barcode}
                className="p-4 bg-white rounded-xl border border-stone-200 hover:border-emerald-600/40 transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-center overflow-hidden shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-xs text-stone-400 font-bold">LL</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-stone-500 truncate">{item.brand}</p>
                    {item.notes && (
                      <p className="text-[11px] text-emerald-800 italic truncate mt-0.5">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.healthScore !== undefined && (
                    <div className="text-right mr-1">
                      <span className="text-[10px] text-stone-400 block">Score</span>
                      <span className="font-display font-bold text-sm text-emerald-900 tabular-nums">
                        {item.healthScore}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      onClose();
                      onSelectProduct(item.barcode);
                    }}
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    title="View Product Analysis"
                  >
                    <span>View</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleRemove(item.barcode)}
                    disabled={deletingBarcode === item.barcode}
                    className="p-2 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Remove from favorites"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
