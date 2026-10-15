export interface INutrientValue {
  value: number | null;
  unit: string;
  isVerified: boolean;
  status: 'verified' | 'estimated' | 'unavailable';
}

export interface INutritionData {
  calories: INutrientValue;
  energyKj: INutrientValue;
  sugar: INutrientValue;
  addedSugar?: INutrientValue;
  sodium: INutrientValue;
  salt: INutrientValue;
  saturatedFat: INutrientValue;
  totalFat: INutrientValue;
  protein: INutrientValue;
  fibre: INutrientValue;
  carbohydrates: INutrientValue;
  servingSize?: string;
}

export interface IScoreComponent {
  label: string;
  points: number; // positive is good, negative is deduction
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
  novaGroup: number | null; // 1, 2, 3, 4
  novaDescription: string;
  positiveAttributes: string[];
  potentialConcerns: string[];
}

/**
 * Calculates a transparent Health Score (0-100) based on nutritional density,
 * FSSAI thresholds, Nutri-Score principles, and NOVA processing level.
 * Avoids false precision; clearly itemizes every deduction and bonus.
 */
export function analyzeNutrition(
  nutrients: Record<string, any>,
  novaGroupRaw?: number | string | null,
  ingredientsText?: string
): INutritionAnalysis {
  const missingDataNotes: string[] = [];
  const scoreBreakdown: IScoreComponent[] = [];

  // Helper to safely extract 100g number
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

  // Track completeness
  let knownCoreCount = 0;
  if (calories !== null) knownCoreCount++;
  else missingDataNotes.push('Calorie/Energy data is not declared on label');

  if (sugar !== null) knownCoreCount++;
  else missingDataNotes.push('Sugar content per 100g is unavailable');

  if (sodium !== null) knownCoreCount++;
  else missingDataNotes.push('Sodium/Salt level per 100g is unavailable');

  if (saturatedFat !== null) knownCoreCount++;
  else missingDataNotes.push('Saturated fat is not specified');

  if (protein !== null) knownCoreCount++;
  else missingDataNotes.push('Protein content is not specified');

  if (fibre !== null) knownCoreCount++;
  else missingDataNotes.push('Dietary fibre is not declared');

  const dataCompleteness: 'high' | 'moderate' | 'low' =
    knownCoreCount >= 5 ? 'high' : knownCoreCount >= 3 ? 'moderate' : 'low';

  // Base score starting at 60 (neutral baseline)
  let baseScore = 60;
  scoreBreakdown.push({
    label: 'Baseline Score',
    points: 60,
    reason: 'Standard neutral baseline prior to nutrient evaluation',
    type: 'neutral',
  });

  const positiveAttributes: string[] = [];
  const potentialConcerns: string[] = [];

  // 1. Protein Bonus (up to +18 points)
  if (protein !== null) {
    if (protein >= 15) {
      scoreBreakdown.push({
        label: 'High Protein',
        points: +15,
        reason: `${protein}g protein per 100g (excellent macronutrient density)`,
        type: 'positive',
      });
      baseScore += 15;
      positiveAttributes.push(`High protein content (${protein}g / 100g)`);
    } else if (protein >= 8) {
      scoreBreakdown.push({
        label: 'Good Protein Source',
        points: +10,
        reason: `${protein}g protein per 100g`,
        type: 'positive',
      });
      baseScore += 10;
      positiveAttributes.push(`Good source of protein (${protein}g / 100g)`);
    } else if (protein >= 4) {
      scoreBreakdown.push({
        label: 'Moderate Protein',
        points: +5,
        reason: `${protein}g protein per 100g`,
        type: 'positive',
      });
      baseScore += 5;
    }
  }

  // 2. Fibre Bonus (up to +15 points)
  if (fibre !== null) {
    if (fibre >= 6) {
      scoreBreakdown.push({
        label: 'High Dietary Fibre',
        points: +15,
        reason: `${fibre}g fibre per 100g (supports gut health & satiety)`,
        type: 'positive',
      });
      baseScore += 15;
      positiveAttributes.push(`High dietary fibre (${fibre}g / 100g)`);
    } else if (fibre >= 3) {
      scoreBreakdown.push({
        label: 'Good Dietary Fibre',
        points: +8,
        reason: `${fibre}g fibre per 100g`,
        type: 'positive',
      });
      baseScore += 8;
      positiveAttributes.push(`Source of dietary fibre (${fibre}g / 100g)`);
    }
  }

  // 3. Sugar Deductions (FSSAI Indian Guideline: >10g is medium, >22.5g is high)
  if (sugar !== null) {
    if (sugar > 25) {
      const deduction = -22;
      scoreBreakdown.push({
        label: 'Excessive Sugar',
        points: deduction,
        reason: `${sugar}g sugar per 100g exceeds recommended daily thresholds`,
        type: 'negative',
      });
      baseScore += deduction;
      potentialConcerns.push(`High sugar content (${sugar}g / 100g)`);
    } else if (sugar > 12) {
      const deduction = -12;
      scoreBreakdown.push({
        label: 'Moderate Sugar',
        points: deduction,
        reason: `${sugar}g sugar per 100g`,
        type: 'negative',
      });
      baseScore += deduction;
      potentialConcerns.push(`Moderate sugar content (${sugar}g / 100g)`);
    } else if (sugar <= 3) {
      scoreBreakdown.push({
        label: 'Low Sugar',
        points: +8,
        reason: `Only ${sugar}g sugar per 100g`,
        type: 'positive',
      });
      baseScore += 8;
      positiveAttributes.push(`Low in sugar (${sugar}g / 100g)`);
    }
  }

  // 4. Sodium / Salt Deductions (FSSAI: >600mg sodium or >1.5g salt per 100g is high)
  if (sodium !== null) {
    const sodiumMg = sodium > 15 ? sodium : sodium * 1000; // detect if in grams vs mg
    if (sodiumMg > 900) {
      const deduction = -20;
      scoreBreakdown.push({
        label: 'Very High Sodium',
        points: deduction,
        reason: `${Math.round(sodiumMg)}mg sodium per 100g is very high`,
        type: 'negative',
      });
      baseScore += deduction;
      potentialConcerns.push(`Very high sodium (${Math.round(sodiumMg)}mg / 100g)`);
    } else if (sodiumMg > 500) {
      const deduction = -10;
      scoreBreakdown.push({
        label: 'Moderate Sodium',
        points: deduction,
        reason: `${Math.round(sodiumMg)}mg sodium per 100g`,
        type: 'negative',
      });
      baseScore += deduction;
      potentialConcerns.push(`Moderate sodium level (${Math.round(sodiumMg)}mg / 100g)`);
    } else if (sodiumMg < 120) {
      scoreBreakdown.push({
        label: 'Low Sodium',
        points: +6,
        reason: `Only ${Math.round(sodiumMg)}mg sodium per 100g`,
        type: 'positive',
      });
      baseScore += 6;
      positiveAttributes.push(`Low in sodium (${Math.round(sodiumMg)}mg / 100g)`);
    }
  }

  // 5. Saturated Fat Deductions (>5g is high, >10g is very high)
  if (saturatedFat !== null) {
    if (saturatedFat > 10) {
      const deduction = -14;
      scoreBreakdown.push({
        label: 'High Saturated Fat',
        points: deduction,
        reason: `${saturatedFat}g saturated fat per 100g`,
        type: 'negative',
      });
      baseScore += deduction;
      potentialConcerns.push(`High saturated fat (${saturatedFat}g / 100g)`);
    } else if (saturatedFat > 4) {
      const deduction = -6;
      scoreBreakdown.push({
        label: 'Moderate Saturated Fat',
        points: deduction,
        reason: `${saturatedFat}g saturated fat per 100g`,
        type: 'negative',
      });
      baseScore += deduction;
    } else if (saturatedFat <= 1.5) {
      scoreBreakdown.push({
        label: 'Low Saturated Fat',
        points: +5,
        reason: `Low saturated fat (${saturatedFat}g / 100g)`,
        type: 'positive',
      });
      baseScore += 5;
      positiveAttributes.push(`Low saturated fat (${saturatedFat}g / 100g)`);
    }
  }

  // 6. Energy Density (Calories)
  if (calories !== null) {
    if (calories > 500) {
      const deduction = -8;
      scoreBreakdown.push({
        label: 'High Energy Density',
        points: deduction,
        reason: `${calories} kcal per 100g`,
        type: 'negative',
      });
      baseScore += deduction;
      potentialConcerns.push(`High calorie density (${calories} kcal / 100g)`);
    }
  }

  // 7. NOVA Processing Level Analysis
  let novaNum: number | null = null;
  if (novaGroupRaw !== undefined && novaGroupRaw !== null) {
    novaNum = Number(novaGroupRaw);
  } else if (ingredientsText) {
    // Basic heuristic if NOVA tag is missing from API
    const lowerIng = ingredientsText.toLowerCase();
    if (
      lowerIng.includes('maltodextrin') ||
      lowerIng.includes('flavour enhancer') ||
      lowerIng.includes('ins 621') ||
      lowerIng.includes('ins 627') ||
      lowerIng.includes('emulsifier') ||
      lowerIng.includes('hydrogenated') ||
      lowerIng.includes('artificial flavour') ||
      lowerIng.includes('ins 150d')
    ) {
      novaNum = 4;
    } else if (lowerIng.includes('salt') || lowerIng.includes('oil') || lowerIng.includes('sugar')) {
      novaNum = 3;
    } else {
      novaNum = 1;
    }
  }

  let novaDescription = 'Processing level could not be determined from available data';
  if (novaNum === 1) {
    scoreBreakdown.push({
      label: 'NOVA 1: Minimally Processed',
      points: +10,
      reason: 'Natural or minimally altered whole food ingredients',
      type: 'positive',
    });
    baseScore += 10;
    novaDescription = 'NOVA 1: Unprocessed or minimally processed foods (whole ingredients, fresh or dried)';
    positiveAttributes.push('Minimally processed (NOVA 1)');
  } else if (novaNum === 2) {
    scoreBreakdown.push({
      label: 'NOVA 2: Culinary Ingredient',
      points: +4,
      reason: 'Processed culinary ingredient derived from nature (e.g. cold-pressed oils, butter, salt)',
      type: 'positive',
    });
    baseScore += 4;
    novaDescription = 'NOVA 2: Processed culinary ingredients (used in home cooking)';
  } else if (novaNum === 3) {
    scoreBreakdown.push({
      label: 'NOVA 3: Processed Food',
      points: -4,
      reason: 'Manufactured by adding sugar, oil, or salt to whole foods (e.g., canned foods, cheeses)',
      type: 'negative',
    });
    baseScore -= 4;
    novaDescription = 'NOVA 3: Processed foods (traditional preparation with added salt/sugar/oil)';
  } else if (novaNum === 4) {
    scoreBreakdown.push({
      label: 'NOVA 4: Ultra-Processed Food',
      points: -12,
      reason: 'Formulated with industrial ingredients, additives, texturizers, and synthetic flavorings',
      type: 'negative',
    });
    baseScore -= 12;
    novaDescription = 'NOVA 4: Ultra-processed food formulation (multiple industrial additives or flavor enhancers)';
    potentialConcerns.push('Ultra-processed food (NOVA 4)');
  }

  // Palm oil detection
  if (ingredientsText) {
    const lowerIng = ingredientsText.toLowerCase();
    if (lowerIng.includes('palm oil') || lowerIng.includes('palmolein') || lowerIng.includes('palm fat')) {
      potentialConcerns.push('Contains Palm Oil / Palmolein');
    }
    if (lowerIng.includes('ins 621') || lowerIng.includes('monosodium glutamate') || lowerIng.includes('msg')) {
      potentialConcerns.push('Contains INS 621 (Monosodium Glutamate)');
    }
    if (lowerIng.includes('maida') || lowerIng.includes('refined wheat flour')) {
      potentialConcerns.push('Made with Refined Wheat Flour (Maida)');
    }
    if (lowerIng.includes('millet') || lowerIng.includes('whole wheat') || lowerIng.includes('ragi') || lowerIng.includes('oats')) {
      positiveAttributes.push('Contains wholesome grains (Millets/Oats/Whole wheat)');
    }
  }

  // Bound score between 5 and 100
  const finalScore = Math.max(5, Math.min(100, Math.round(baseScore)));

  let healthScoreGrade: 'A' | 'B' | 'C' | 'D' | 'E';
  if (finalScore >= 80) healthScoreGrade = 'A';
  else if (finalScore >= 65) healthScoreGrade = 'B';
  else if (finalScore >= 45) healthScoreGrade = 'C';
  else if (finalScore >= 30) healthScoreGrade = 'D';
  else healthScoreGrade = 'E';

  const calculationFormula =
    'Score = 60 (Baseline) + Protein/Fibre Bonuses - Sugar/Sodium/SatFat Deductions - NOVA 4 Processing Penalty';

  return {
    healthScore: finalScore,
    healthScoreGrade,
    scoreBreakdown,
    calculationFormula,
    dataCompleteness,
    missingDataNotes,
    novaGroup: novaNum,
    novaDescription,
    positiveAttributes,
    potentialConcerns,
  };
}
