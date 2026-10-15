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

// Comprehensive synonym dictionary for packaged food ingredients
const ALLERGEN_SYNONYMS: Record<string, { synonyms: string[]; directTerms: string[] }> = {
  peanuts: {
    directTerms: ['peanut', 'peanuts', 'arachis', 'groundnut', 'groundnuts', 'mungfali'],
    synonyms: ['peanut butter', 'peanut flour', 'peanut oil', 'arachis hypogaea'],
  },
  'tree nuts': {
    directTerms: [
      'tree nut', 'tree nuts', 'almond', 'almonds', 'cashew', 'cashews',
      'walnut', 'walnuts', 'pistachio', 'pistachios', 'hazelnut', 'hazelnuts',
      'pecan', 'pecans', 'macadamia', 'brazil nut', 'badam', 'kaju', 'pista', 'akhrot',
    ],
    synonyms: ['prunus dulcis', 'anacardium', 'juglans', 'nut paste', 'marzipan', 'praline'],
  },
  milk: {
    directTerms: ['milk', 'dairy', 'milk solids', 'skimmed milk powder', 'whole milk powder', 'milk fat'],
    synonyms: [
      'whey', 'casein', 'caseinate', 'calcium caseinate', 'sodium caseinate',
      'lactose', 'butter', 'butterfat', 'buttermilk', 'ghee', 'paneer', 'cheese',
      'curd', 'dahi', 'cream', 'khoa', 'mawa', 'condensed milk', 'lactalbumin',
    ],
  },
  eggs: {
    directTerms: ['egg', 'eggs', 'egg powder', 'egg white', 'egg yolk'],
    synonyms: ['albumin', 'ovalbumin', 'ovoglobulin', 'lysozyme', 'meringue', 'mayonnaise'],
  },
  soy: {
    directTerms: ['soy', 'soya', 'soybean', 'soybeans', 'edamame'],
    synonyms: ['soya lecithin', 'soy lecithin', 'tofu', 'soya chunks', 'hydrolyzed soy protein', 'soy flour', 'soya sauce'],
  },
  wheat: {
    directTerms: ['wheat', 'refined wheat flour', 'whole wheat flour', 'maida', 'atta'],
    synonyms: ['semolina', 'suji', 'rawa', 'durum', 'spelt', 'emmer', 'farina', 'graham flour'],
  },
  gluten: {
    directTerms: ['gluten', 'wheat gluten', 'vital wheat gluten'],
    synonyms: ['wheat', 'barley', 'rye', 'malt', 'malt extract', 'triticale', 'spelt', 'brewer\'s yeast', 'seitan'],
  },
  sesame: {
    directTerms: ['sesame', 'sesame seed', 'sesame seeds', 'til'],
    synonyms: ['tahini', 'sesame oil', 'gingelly', 'sesamum indicum'],
  },
  fish: {
    directTerms: ['fish', 'tuna', 'salmon', 'cod', 'anchovy', 'sardine', 'mackerel', 'tilapia', 'rohu', 'katla'],
    synonyms: ['fish sauce', 'isinglass', 'fish gelatin', 'omega-3 fish oil'],
  },
  shellfish: {
    directTerms: ['shellfish', 'crustacean', 'crustaceans', 'mollusc', 'molluscs', 'prawn', 'prawns', 'shrimp', 'shrimps', 'crab', 'lobster'],
    synonyms: ['clam', 'oyster', 'mussel', 'squid', 'calamari', 'octopus', 'crawfish', 'glucosamine'],
  },
};

/**
 * Evaluates a product against a user's declared allergies.
 * Yields RED, AMBER, or GREEN with exact explanations.
 */
export function evaluateAllergens(
  userAllergies: string[],
  productData: {
    ingredientsText?: string;
    allergensTags?: string[];
    tracesTags?: string[];
    allergensHierarchy?: string[];
    tracesHierarchy?: string[];
    ingredientsAnalysisTags?: string[];
  }
): IAllergenAnalysisResult {
  const disclaimer =
    'Mandatory Food Safety Notice: No automated detection can guarantee a product is 100% allergen-free. Food manufacturers frequently update manufacturing lines and formulations. Always verify the physical packaging label and allergen box before consuming.';

  // If user has not specified any allergies
  if (!userAllergies || userAllergies.length === 0) {
    return {
      status: 'GREEN',
      title: 'No User Allergies Declared',
      matches: [],
      warnings: ['You have not added any personal allergies to your profile.'],
      disclaimer,
      isSafeForUser: true,
    };
  }

  const rawIngredients = productData.ingredientsText?.toLowerCase() || '';
  const allergensTags = (productData.allergensTags || []).map((t) => t.toLowerCase());
  const tracesTags = (productData.tracesTags || []).map((t) => t.toLowerCase());

  // Check if ingredients data is missing or too sparse (AMBER trigger)
  const isIngredientsMissing = !rawIngredients || rawIngredients.trim().length < 10;
  const isAllergenDataMissing = allergensTags.length === 0 && tracesTags.length === 0;

  const matches: IAllergenMatch[] = [];
  const ambiguityWarnings: string[] = [];

  for (const allergy of userAllergies) {
    const cleanAllergy = allergy.toLowerCase().trim();
    const allergenConfig = ALLERGEN_SYNONYMS[cleanAllergy];

    let detectedForThisAllergy = false;

    // 1. Check official Open Food Facts allergen tags (e.g., "en:milk", "en:gluten")
    for (const tag of allergensTags) {
      const cleanTag = tag.replace(/^.*:/, '');
      if (cleanTag === cleanAllergy || (allergenConfig && allergenConfig.directTerms.some((t) => cleanTag.includes(t)))) {
        matches.push({
          allergen: allergy,
          foundIn: 'allergen_tag',
          matchedTerm: tag,
          explanation: `The manufacturer explicitly declared '${cleanTag}' in the certified allergen disclosure list.`,
        });
        detectedForThisAllergy = true;
        break;
      }
    }

    // 2. Check traces / cross-contamination warnings
    for (const trace of tracesTags) {
      const cleanTrace = trace.replace(/^.*:/, '');
      if (cleanTrace === cleanAllergy || (allergenConfig && allergenConfig.directTerms.some((t) => cleanTrace.includes(t)))) {
        matches.push({
          allergen: allergy,
          foundIn: 'traces_warning',
          matchedTerm: trace,
          explanation: `Cross-contamination warning: Packaging states this facility may process or contain traces of '${cleanTrace}'.`,
        });
        detectedForThisAllergy = true;
        break;
      }
    }

    if (detectedForThisAllergy) continue;

    // 3. Search ingredients text for direct terms and synonyms
    if (rawIngredients) {
      if (allergenConfig) {
        // Direct term check
        for (const direct of allergenConfig.directTerms) {
          const regex = new RegExp(`\\b${escapeRegExp(direct)}\\b`, 'i');
          if (regex.test(rawIngredients)) {
            matches.push({
              allergen: allergy,
              foundIn: 'ingredients_explicit',
              matchedTerm: direct,
              explanation: `Direct ingredient match: The label explicitly lists '${direct}' in the ingredients declaration.`,
            });
            detectedForThisAllergy = true;
            break;
          }
        }

        // Synonym check if direct not found
        if (!detectedForThisAllergy) {
          for (const syn of allergenConfig.synonyms) {
            const regex = new RegExp(`\\b${escapeRegExp(syn)}\\b`, 'i');
            if (regex.test(rawIngredients)) {
              matches.push({
                allergen: allergy,
                foundIn: 'ingredients_synonym',
                matchedTerm: syn,
                explanation: `Inferred allergen match: '${syn}' is a known derivative or synonym of '${allergy}'.`,
              });
              detectedForThisAllergy = true;
              break;
            }
          }
        }
      } else {
        // Custom user allergy string
        const regex = new RegExp(`\\b${escapeRegExp(cleanAllergy)}\\b`, 'i');
        if (regex.test(rawIngredients)) {
          matches.push({
            allergen: allergy,
            foundIn: 'ingredients_explicit',
            matchedTerm: allergy,
            explanation: `Custom allergen match: Found '${allergy}' directly in the ingredients list.`,
          });
          detectedForThisAllergy = true;
        }
      }
    }
  }

  // Determine overall status
  if (matches.length > 0) {
    return {
      status: 'RED',
      title: 'Potential Allergen Match Detected',
      matches,
      warnings: [
        'WARNING: This product contains ingredients or cross-contamination warnings matching your saved allergies.',
        'DO NOT CONSUME without reviewing the physical package.',
      ],
      disclaimer,
      isSafeForUser: false,
    };
  }

  if (isIngredientsMissing && isAllergenDataMissing) {
    return {
      status: 'AMBER',
      title: 'Allergen Data Incomplete or Ambiguous',
      matches: [],
      warnings: [
        'Ingredients text and official allergen declarations are missing or incomplete in the product database.',
        'Never assume a product is safe when data is missing. Please check the physical package wrapper.',
      ],
      disclaimer,
      isSafeForUser: false,
    };
  }

  // Otherwise GREEN
  return {
    status: 'GREEN',
    title: 'No Allergen Match Detected',
    matches: [],
    warnings: [
      'No matches were detected for your saved allergies in the available ingredients and declarations.',
    ],
    disclaimer,
    isSafeForUser: true,
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
