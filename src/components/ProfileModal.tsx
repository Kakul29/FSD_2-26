import React, { useState } from 'react';
import { X, Shield, Plus, Check, Heart, Apple, Activity, AlertCircle } from 'lucide-react';
import { IUser, IUserProfile } from '../types';
import { api } from '../services/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: IUser | null;
  onProfileUpdated: (updatedUser: IUser) => void;
  onOpenAuth: () => void;
}

const COMMON_ALLERGIES = [
  'peanuts',
  'tree nuts',
  'milk',
  'eggs',
  'soy',
  'wheat',
  'gluten',
  'sesame',
  'fish',
  'shellfish',
];

const DIETARY_PREFERENCES = [
  { id: 'vegetarian', label: 'Vegetarian (No meat/fish)' },
  { id: 'vegan', label: 'Vegan (Strict plant-based)' },
  { id: 'jain', label: 'Jain (No root vegetables/onion/garlic)' },
  { id: 'lactose-free', label: 'Lactose-Free' },
];

const HEALTH_GOALS = [
  { id: 'reduce_sugar', label: 'Reduce Added Sugar' },
  { id: 'reduce_sodium', label: 'Lower Sodium / Salt' },
  { id: 'increase_protein', label: 'Increase Protein Intake' },
  { id: 'increase_fibre', label: 'Boost Dietary Fibre' },
  { id: 'less_processed', label: 'Avoid Ultra-Processed (NOVA 4)' },
];

const HEALTH_CONDITIONS = [
  { id: 'diabetes', label: 'Diabetes / Blood Sugar Management' },
  { id: 'high_blood_pressure', label: 'High Blood Pressure (Hypertension)' },
  { id: 'high_cholesterol', label: 'High Cholesterol / Heart Health' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
  onOpenAuth,
}) => {
  const [allergies, setAllergies] = useState<string[]>(currentUser?.profile?.allergies || []);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(
    currentUser?.profile?.dietaryPreferences || ['vegetarian']
  );
  const [goals, setGoals] = useState<string[]>(
    currentUser?.profile?.goals || ['reduce_sugar', 'less_processed']
  );
  const [healthConditions, setHealthConditions] = useState<string[]>(
    currentUser?.profile?.healthConditions || []
  );
  const [customAllergy, setCustomAllergy] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
        <div className="w-full max-w-md bg-[#FBF9F5] rounded-2xl border border-stone-200 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-stone-900">Personal Food Profile</h3>
            <p className="text-xs text-stone-600 mt-1">
              Sign in to save your personal allergies, dietary rules, and health goals to get live allergen warnings on every scanned item.
            </p>
          </div>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 text-xs font-semibold rounded-lg text-stone-700 hover:bg-stone-100"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              Sign In or Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  const toggleAllergy = (allergy: string) => {
    setAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  const handleAddCustomAllergy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAllergy.trim()) return;
    const clean = customAllergy.trim().toLowerCase();
    if (!allergies.includes(clean)) {
      setAllergies([...allergies, clean]);
    }
    setCustomAllergy('');
  };

  const togglePreference = (pref: string) => {
    setDietaryPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  const toggleGoal = (goal: string) => {
    setGoals((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]));
  };

  const toggleCondition = (cond: string) => {
    setHealthConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await api.updateProfile({
        allergies,
        dietaryPreferences,
        goals,
        healthConditions,
      });
      setIsSaving(false);
      setSaveSuccess(true);
      onProfileUpdated(res.user);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-[#FBF9F5] rounded-2xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div>
            <h2 className="font-display font-bold text-lg text-stone-900">
              Personal Food & Allergy Profile
            </h2>
            <p className="text-xs text-stone-500">
              Configured rules will automatically evaluate all food labels and allergen disclosures.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Food Allergies */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-600" />
              <h3 className="font-semibold text-xs text-stone-800 uppercase tracking-wide">
                Food Allergies & Intolerances
              </h3>
            </div>
            <p className="text-xs text-stone-500">
              Select any ingredients you are allergic to. LabelLens will flag them in RED on every product.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMON_ALLERGIES.map((allergy) => {
                const isSelected = allergies.includes(allergy);
                return (
                  <button
                    key={allergy}
                    type="button"
                    onClick={() => toggleAllergy(allergy)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all flex items-center justify-between capitalize ${
                      isSelected
                        ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span>{allergy}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-rose-600" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Allergy Adder */}
            <form onSubmit={handleAddCustomAllergy} className="flex gap-2 pt-1">
              <input
                type="text"
                value={customAllergy}
                onChange={(e) => setCustomAllergy(e.target.value)}
                placeholder="Add custom allergen (e.g. mustard, celery, sulfites)..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-emerald-700 text-stone-900"
              />
              <button
                type="submit"
                disabled={!customAllergy.trim()}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 disabled:opacity-40 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Selected Custom List */}
            {allergies.filter((a) => !COMMON_ALLERGIES.includes(a)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {allergies
                  .filter((a) => !COMMON_ALLERGIES.includes(a))
                  .map((cust) => (
                    <span
                      key={cust}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-200"
                    >
                      <span className="capitalize">{cust}</span>
                      <button
                        type="button"
                        onClick={() => toggleAllergy(cust)}
                        className="hover:text-rose-700 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Section 2: Dietary Preferences */}
          <div className="space-y-3 pt-2 border-t border-stone-200">
            <div className="flex items-center gap-2">
              <Apple className="w-4 h-4 text-emerald-700" />
              <h3 className="font-semibold text-xs text-stone-800 uppercase tracking-wide">
                Dietary Preferences
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DIETARY_PREFERENCES.map((pref) => {
                const isSelected = dietaryPreferences.includes(pref.id);
                return (
                  <button
                    key={pref.id}
                    type="button"
                    onClick={() => togglePreference(pref.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span>{pref.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Personal Nutritional Goals */}
          <div className="space-y-3 pt-2 border-t border-stone-200">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-xs text-stone-800 uppercase tracking-wide">
                Nutritional Goals
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HEALTH_GOALS.map((goal) => {
                const isSelected = goals.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span>{goal.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-700" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Health Considerations */}
          <div className="space-y-3 pt-2 border-t border-stone-200">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-xs text-stone-800 uppercase tracking-wide">
                Health Considerations (Optional)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HEALTH_CONDITIONS.map((cond) => {
                const isSelected = healthConditions.includes(cond.id);
                return (
                  <button
                    key={cond.id}
                    type="button"
                    onClick={() => toggleCondition(cond.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-950 shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span>{cond.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-700" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-white">
          <p className="text-[11px] text-stone-500">
            {saveSuccess ? 'Changes saved to profile!' : 'Changes are stored securely in MongoDB.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Food Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
