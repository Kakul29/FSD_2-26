export interface IUserProfile {
  allergies: string[];
  dietaryPreferences: string[];
  goals: string[];
  healthConditions: string[];
}

export interface IUser {
  id: string;
  email: string;
  name: string;
  profile: IUserProfile;
  history?: IHistoryItem[];
  favorites?: IFavoriteItem[];
}

export interface IHistoryItem {
  barcode: string;
  name: string;
  brand: string;
  image?: string;
  healthScore?: number;
  viewedAt: string;
}

export interface IFavoriteItem {
  barcode: string;
  name: string;
  brand: string;
  image?: string;
  healthScore?: number;
  notes?: string;
  savedAt: string;
}

export interface IScoreComponent {
  label: string;
  points: number;
  reason: string;
  type: 'positive' | 'negative' | 'neutral';
}

export interface INutritionAnalysis {
  healthScore: number;
  healthScoreGrade: 'A' | 'B' | 'C' | 'D' | 'E';
  scoreBreakdown: IScoreComponent[];
  calculationFormula: string;
  dataCompleteness: 'high' | 'moderate' | 'low';
  missingDataNotes: string[];
  novaGroup: number | null;
  novaDescription: string;
  positiveAttributes: string[];
  potentialConcerns: string[];
}

export interface IAllergenMatch {
  allergen: string;
  foundIn: 'ingredients_explicit' | 'ingredients_synonym' | 'traces_warning' | 'allergen_tag';
  matchedTerm: string;
  explanation: string;
}

export interface IAllergenAnalysisResult {
  status: 'RED' | 'AMBER' | 'GREEN';
  title: string;
  matches: IAllergenMatch[];
  warnings: string[];
  disclaimer: string;
  isSafeForUser: boolean;
}

export interface IPersonalizedAlert {
  type: 'danger' | 'warning' | 'positive' | 'info';
  title: string;
  description: string;
  guidelineStandard: string;
  metric?: string;
  value?: number;
  threshold?: number;
}

export interface IFormattedProduct {
  barcode: string;
  name: string;
  brand: string;
  image: string;
  categories: string[];
  category: string;
  servingSize: string;
  ingredientsText: string;
  allergensTags: string[];
  tracesTags: string[];
  nutrients: Record<string, any>;
  nutritionAnalysis: INutritionAnalysis;
  allergenAnalysis?: IAllergenAnalysisResult;
  personalizedWarnings?: {
    alerts: IPersonalizedAlert[];
    assessmentComplete: boolean;
    medicalDisclaimer: string;
  };
  isIndianBrand: boolean;
  availableInIndia: boolean;
  dataSource: 'openfoodfacts_live' | 'verified_catalog';
}

export interface IAlternativeItem {
  product: IFormattedProduct;
  rank: number;
  whyBetter: string;
  tradeOffs: string[];
  scoreDifference: number;
  sugarDelta: number | null;
  sodiumDelta: number | null;
  proteinDelta: number | null;
  fibreDelta: number | null;
}

export interface IAlternativesResponse {
  targetProduct: IFormattedProduct;
  bestChoice: IFormattedProduct | null;
  alternatives: IAlternativeItem[];
  categoryName: string;
  totalFound: number;
  explanation: string;
}
