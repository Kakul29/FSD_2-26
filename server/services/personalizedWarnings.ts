import { IUserProfile } from '../models/User';

export interface IPersonalizedAlert {
  type: 'danger' | 'warning' | 'positive' | 'info';
  title: string;
  description: string;
  guidelineStandard: string;
  metric?: string;
  value?: number;
  threshold?: number;
}

export function evaluatePersonalizedWarnings(
  profile: IUserProfile,
  nutrients: Record<string, any>,
  ingredientsText: string = '',
  novaGroup?: number | null
): {
  alerts: IPersonalizedAlert[];
  assessmentComplete: boolean;
  medicalDisclaimer: string;
} {
  const alerts: IPersonalizedAlert[] = [];
  const medicalDisclaimer =
    'Medical & General Food Notice: LabelLens provides generalized nutritional comparison based on recognized dietary guidance and FSSAI packaging guidelines. It is not medical advice, diagnosis, or personalized treatment. Consult a licensed healthcare professional for dietary management of clinical conditions.';

  const get100g = (key: string): number | null => {
    const val = nutrients[key] ?? nutrients[`${key}_100g`] ?? nutrients[`${key}_value`];
    if (val !== undefined && val !== null && !isNaN(Number(val))) {
      return Number(val);
    }
    return null;
  };

  const calories = get100g('energy-kcal') ?? (get100g('energy') ? Math.round(get100g('energy')! / 4.184) : null);
  const sugar = get100g('sugars');
  const sodium = get100g('sodium') ?? (get100g('salt') ? Math.round((get100g('salt')! / 2.5) * 1000) / 1000 : null);
  const saturatedFat = get100g('saturated-fat');
  const protein = get100g('proteins');
  const fibre = get100g('fiber');

  const goals = profile.goals || [];
  const healthConditions = profile.healthConditions || [];
  const dietaryPreferences = profile.dietaryPreferences || [];

  // 1. Dietary Preference Checks (Vegetarian, Vegan, Jain)
  const lowerIng = ingredientsText.toLowerCase();

  if (dietaryPreferences.includes('vegetarian') || dietaryPreferences.includes('vegan') || dietaryPreferences.includes('jain')) {
    // Non-veg indicators
    const nonVegTerms = ['gelatin', 'gelatine', 'carmine', 'cochineal', 'ins 120', 'rennet', 'animal fat', 'beef', 'pork', 'chicken', 'fish oil', 'lard', 'bone char'];
    const matchedNonVeg = nonVegTerms.filter((term) => lowerIng.includes(term));
    if (matchedNonVeg.length > 0) {
      alerts.push({
        type: 'danger',
        title: 'Non-Vegetarian Ingredient Detected',
        description: `Contains '${matchedNonVeg.join(', ')}' which is animal-derived.`,
        guidelineStandard: 'FSSAI Brown/Red Non-Veg Labelling Standard',
      });
    }

    if (dietaryPreferences.includes('vegan')) {
      const dairyEggs = ['milk', 'dairy', 'whey', 'butter', 'ghee', 'cheese', 'paneer', 'egg', 'honey', 'casein', 'lactose'];
      const matchedDairy = dairyEggs.filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(lowerIng));
      if (matchedDairy.length > 0) {
        alerts.push({
          type: 'warning',
          title: 'Animal By-Product for Vegan Diet',
          description: `Contains dairy/animal derivatives: ${matchedDairy.slice(0, 3).join(', ')}.`,
          guidelineStandard: 'Vegan Dietary Standard',
        });
      }
    }

    if (dietaryPreferences.includes('jain')) {
      const rootVeg = ['onion', 'garlic', 'potato', 'ginger', 'carrot', 'radish', 'pyaz', 'lahsun', 'aloo', 'beetroot', 'turnip'];
      const matchedRoot = rootVeg.filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(lowerIng));
      if (matchedRoot.length > 0) {
        alerts.push({
          type: 'warning',
          title: 'Root Vegetables Detected (Jain Diet)',
          description: `Contains root vegetable or powder: ${matchedRoot.slice(0, 3).join(', ')}.`,
          guidelineStandard: 'Jain Dietary Practice (Ahinsa)',
        });
      }
    }
  }

  // 2. Reduce Sugar Goal & Diabetes Condition
  const wantsReduceSugar = goals.includes('reduce_sugar') || healthConditions.includes('diabetes');
  if (wantsReduceSugar) {
    if (sugar === null) {
      alerts.push({
        type: 'info',
        title: 'Sugar Data Incomplete',
        description: 'Product label does not state sugar per 100g. Cannot verify your sugar-reduction target.',
        guidelineStandard: 'FSSAI Mandatory Nutrition Declaration',
      });
    } else if (sugar > 15) {
      alerts.push({
        type: 'danger',
        title: 'High Sugar Alert',
        description: `${sugar}g sugar per 100g conflicts with your goal to reduce sugar intake. FSSAI recommends keeping added sugars minimal.`,
        guidelineStandard: 'WHO & FSSAI Guidelines (>10g/100g is elevated)',
        metric: 'Sugar',
        value: sugar,
        threshold: 10,
      });
    } else if (sugar <= 5) {
      alerts.push({
        type: 'positive',
        title: 'Low Sugar Match',
        description: `Only ${sugar}g sugar per 100g. Fits your sugar-conscious goals nicely.`,
        guidelineStandard: 'FSSAI Low-Sugar Definition (<5g/100g)',
        metric: 'Sugar',
        value: sugar,
        threshold: 5,
      });
    }
  }

  // 3. Reduce Sodium Goal & High Blood Pressure Condition
  const wantsReduceSodium = goals.includes('reduce_sodium') || healthConditions.includes('high_blood_pressure');
  if (wantsReduceSodium) {
    if (sodium === null) {
      alerts.push({
        type: 'info',
        title: 'Sodium Content Missing',
        description: 'Sodium/Salt per 100g is not listed on this product label.',
        guidelineStandard: 'FSSAI Guidelines',
      });
    } else {
      const sodiumMg = sodium > 15 ? sodium : sodium * 1000;
      if (sodiumMg > 500) {
        alerts.push({
          type: 'danger',
          title: 'High Sodium Alert',
          description: `${Math.round(sodiumMg)}mg sodium per 100g exceeds recommended limits for blood pressure management.`,
          guidelineStandard: 'ICMR-NIN India / FSSAI (>400mg sodium per 100g is high)',
          metric: 'Sodium',
          value: Math.round(sodiumMg),
          threshold: 400,
        });
      } else if (sodiumMg < 120) {
        alerts.push({
          type: 'positive',
          title: 'Low Sodium Choice',
          description: `Only ${Math.round(sodiumMg)}mg sodium per 100g, supporting heart and blood pressure goals.`,
          guidelineStandard: 'FSSAI Low Sodium (<120mg/100g)',
          metric: 'Sodium',
          value: Math.round(sodiumMg),
          threshold: 120,
        });
      }
    }
  }

  // 4. High Cholesterol & Saturated Fat
  const caresCholesterol = healthConditions.includes('high_cholesterol') || goals.includes('less_processed');
  if (caresCholesterol && saturatedFat !== null) {
    if (saturatedFat > 6) {
      alerts.push({
        type: 'warning',
        title: 'Elevated Saturated Fat',
        description: `${saturatedFat}g saturated fat per 100g. Consider moderating portion size for cholesterol health.`,
        guidelineStandard: 'ICMR-NIN Recommended Fat Limits (<5g/100g)',
        metric: 'Saturated Fat',
        value: saturatedFat,
        threshold: 5,
      });
    }
  }

  // 5. Increase Protein Goal
  if (goals.includes('increase_protein')) {
    if (protein !== null) {
      if (protein >= 10) {
        alerts.push({
          type: 'positive',
          title: 'High Protein Goal Match',
          description: `Provides ${protein}g protein per 100g, making this a strong contributor to your daily protein requirement.`,
          guidelineStandard: 'FSSAI Rich in Protein Standard (>=12% energy or >=10g/100g)',
          metric: 'Protein',
          value: protein,
          threshold: 10,
        });
      } else if (protein < 3) {
        alerts.push({
          type: 'info',
          title: 'Low Protein Content',
          description: `Only ${protein}g protein per 100g. This item will not meaningfully contribute to your protein goal.`,
          guidelineStandard: 'General Macronutrient Distribution',
          metric: 'Protein',
          value: protein,
          threshold: 10,
        });
      }
    }
  }

  // 6. Increase Fibre Goal
  if (goals.includes('increase_fibre')) {
    if (fibre !== null) {
      if (fibre >= 6) {
        alerts.push({
          type: 'positive',
          title: 'High Fibre Goal Match',
          description: `Contains ${fibre}g dietary fibre per 100g, promoting healthy digestion and prolonged satiety.`,
          guidelineStandard: 'FSSAI High in Fibre Standard (>=6g/100g)',
          metric: 'Fibre',
          value: fibre,
          threshold: 6,
        });
      } else if (fibre < 2) {
        alerts.push({
          type: 'info',
          title: 'Low Fibre Content',
          description: `Provides only ${fibre}g fibre per 100g.`,
          guidelineStandard: 'FSSAI Dietary Guidelines',
          metric: 'Fibre',
          value: fibre,
          threshold: 3,
        });
      }
    }
  }

  // 7. Less Processed Goal
  if (goals.includes('less_processed') && novaGroup) {
    if (novaGroup === 4) {
      alerts.push({
        type: 'warning',
        title: 'Ultra-Processed Formulation (NOVA 4)',
        description: 'Contains industrial formulations and additives that conflict with your goal of eating less processed whole foods.',
        guidelineStandard: 'NOVA Food Processing Classification',
      });
    } else if (novaGroup === 1) {
      alerts.push({
        type: 'positive',
        title: 'Whole & Minimally Processed Food (NOVA 1)',
        description: 'Matches your goal of choosing unrefined, clean, minimally processed food products.',
        guidelineStandard: 'NOVA Group 1 Definition',
      });
    }
  }

  const assessmentComplete = sugar !== null && sodium !== null && saturatedFat !== null && protein !== null;

  return {
    alerts,
    assessmentComplete,
    medicalDisclaimer,
  };
}
