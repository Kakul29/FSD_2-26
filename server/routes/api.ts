import { Router, Request, Response } from 'express';
import { getDBStatus } from '../db';
import { UserRepository } from '../models/User';
import { requireAuth, optionalAuth, generateToken, AuthRequest } from '../middleware/auth';
import {
  getProductByBarcode,
  searchProducts,
  findHealthierAlternatives,
  VERIFIED_PRODUCT_CATALOG,
  formatProductData,
} from '../services/openFoodFacts';
import { GoogleGenAI } from '@google/genai';

const router = Router();

// ==========================================
// 1. Health-Check Endpoint (Requirement 9)
// ==========================================
router.get('/health', async (req: Request, res: Response) => {
  const dbStatus = getDBStatus();

  // Test Open Food Facts external connectivity
  let offApiStatus = 'healthy';
  let offApiLatencyMs = 0;
  try {
    const start = Date.now();
    const probe = await fetch('https://world.openfoodfacts.org/api/v2/product/8901058862392.json', {
      method: 'HEAD',
      headers: { 'User-Agent': 'LabelLensHealthProbe/1.0' },
    });
    offApiLatencyMs = Date.now() - start;
    if (!probe.ok && probe.status !== 404) {
      offApiStatus = `degraded (${probe.status})`;
    }
  } catch (err: any) {
    offApiStatus = `offline / unreached (${err.message})`;
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'LabelLens AI-Powered Food Scanner API',
    environment: process.env.NODE_ENV || 'development',
    database: {
      type: 'MongoDB',
      connected: dbStatus.connected,
      mode: dbStatus.connected ? 'MongoDB Live Connection' : 'Resilient In-Memory Storage Adapter',
      details: dbStatus.database,
      error: dbStatus.error,
    },
    externalServices: {
      openFoodFacts: {
        status: offApiStatus,
        latencyMs: offApiLatencyMs,
        verifiedCatalogSize: Object.keys(VERIFIED_PRODUCT_CATALOG).length,
      },
      geminiAI: {
        enabled: Boolean(process.env.GEMINI_API_KEY),
      },
    },
  });
});

// ==========================================
// 2. User Authentication (Requirement 6)
// ==========================================

// Register
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, profile } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const newUser = await UserRepository.createUser({
      email,
      password,
      name,
      profile,
    });

    const token = generateToken({ id: (newUser as any)._id || (newUser as any).id, email: newUser.email });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: (newUser as any)._id || (newUser as any).id,
        email: newUser.email,
        name: newUser.name,
        profile: newUser.profile,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Registration failed', message: err.message });
  }
});

// Login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ id: (user as any)._id || (user as any).id, email: user.email });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: (user as any)._id || (user as any).id,
        email: user.email,
        name: user.name,
        profile: user.profile,
        history: user.history || [],
        favorites: user.favorites || [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed', message: err.message });
  }
});

// Get Current User
router.get('/auth/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await UserRepository.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user', message: err.message });
  }
});

// ==========================================
// 3. User Profile & Preferences (Req 6 & 8)
// ==========================================
router.put('/user/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { allergies, dietaryPreferences, goals, healthConditions } = req.body;

    const updated = await UserRepository.updateProfile(req.user!.id, {
      allergies: Array.isArray(allergies) ? allergies : undefined,
      dietaryPreferences: Array.isArray(dietaryPreferences) ? dietaryPreferences : undefined,
      goals: Array.isArray(goals) ? goals : undefined,
      healthConditions: Array.isArray(healthConditions) ? healthConditions : undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Personal food profile updated successfully',
      user: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile', message: err.message });
  }
});

// History Endpoints
router.get('/user/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await UserRepository.findById(req.user!.id);
    res.json({ history: (user as any)?.history || [] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch history', message: err.message });
  }
});

router.post('/user/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { barcode, name, brand, image, healthScore } = req.body;
    if (!barcode || !name) {
      return res.status(400).json({ error: 'Barcode and name required' });
    }

    await UserRepository.addHistory(req.user!.id, {
      barcode,
      name,
      brand: brand || 'Unknown Brand',
      image,
      healthScore,
    });

    res.json({ message: 'History recorded' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record history', message: err.message });
  }
});

// Favorites Endpoints
router.get('/user/favorites', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await UserRepository.findById(req.user!.id);
    res.json({ favorites: (user as any)?.favorites || [] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch favorites', message: err.message });
  }
});

router.post('/user/favorites', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { barcode, name, brand, image, healthScore, notes } = req.body;
    if (!barcode || !name) {
      return res.status(400).json({ error: 'Barcode and name required' });
    }

    const updated = await UserRepository.addFavorite(req.user!.id, {
      barcode,
      name,
      brand: brand || 'Unknown Brand',
      image,
      healthScore,
      notes,
    });

    res.json({ message: 'Added to favorites', user: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add favorite', message: err.message });
  }
});

router.delete('/user/favorites/:barcode', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await UserRepository.removeFavorite(req.user!.id, req.params.barcode);
    res.json({ message: 'Removed from favorites', user: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove favorite', message: err.message });
  }
});

// ==========================================
// 4. Products: Barcode Lookup & Search (Req 3, 4, 7, 8)
// ==========================================

// Lookup by barcode
router.get('/products/barcode/:barcode', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { barcode } = req.params;

    // Get user profile if authenticated
    let userProfile = undefined;
    if (req.user) {
      const user = await UserRepository.findById(req.user.id);
      if (user) {
        userProfile = (user as any).profile;
      }
    }

    const product = await getProductByBarcode(barcode, userProfile);

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
        barcode,
        message:
          'No product matching this barcode could be found in Open Food Facts or our verified Indian packaged foods catalog. Please check the barcode digits or search by product name.',
      });
    }

    // Record to history if user is authenticated
    if (req.user) {
      UserRepository.addHistory(req.user.id, {
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        image: product.image,
        healthScore: product.nutritionAnalysis.healthScore,
      }).catch(() => {});
    }

    res.json({ product });
  } catch (err: any) {
    res.status(500).json({ error: 'Barcode lookup failed', message: err.message });
  }
});

// Search products by craving / category
router.get('/products/search', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const filter = (req.query.filter as any) || 'all';

    if (!query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let userProfile = undefined;
    if (req.user) {
      const user = await UserRepository.findById(req.user.id);
      if (user) userProfile = (user as any).profile;
    }

    const products = await searchProducts(query, filter, userProfile);

    res.json({
      query,
      filter,
      total: products.length,
      bestMatch: products.length > 0 ? products[0] : null,
      results: products,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

// Get healthier alternatives for a product (Requirement 5)
router.get('/products/:barcode/alternatives', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { barcode } = req.params;

    let userProfile = undefined;
    if (req.user) {
      const user = await UserRepository.findById(req.user.id);
      if (user) userProfile = (user as any).profile;
    }

    const targetProduct = await getProductByBarcode(barcode, userProfile);
    if (!targetProduct) {
      return res.status(404).json({ error: 'Target product not found' });
    }

    const alternativesData = await findHealthierAlternatives(targetProduct, userProfile);

    res.json(alternativesData);
  } catch (err: any) {
    res.status(500).json({ error: 'Alternatives retrieval failed', message: err.message });
  }
});

// ==========================================
// 5. Deep AI Ingredient Insights (Gemini)
// ==========================================
router.post('/ai/deep-insights', async (req: Request, res: Response) => {
  try {
    const { productName, brand, ingredientsText, healthScore, allergens } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        available: false,
        message: 'Gemini API key is not configured in environment.',
      });
    }

    const ai = new GoogleGenAI();
    const prompt = `You are an expert food scientist and clinical nutritionist. Provide a clear, educational, consumer-friendly breakdown of this packaged food:
Product: ${productName} (${brand})
Current Health Score: ${healthScore}/100
Ingredients List: ${ingredientsText || 'Not provided'}
Declared Allergens: ${allergens?.join(', ') || 'None declared'}

Please analyze:
1. Three key nutritional insights (plain English, actionable).
2. Clarification on complex additive codes (INS numbers, emulsifiers, preservatives) and what they do.
3. Realistic, balanced consumer takeaway (is this suitable for occasional consumption vs everyday staple?).
Format with clean bullet points. Keep it under 250 words. Do not give medical diagnoses.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({
      available: true,
      insights: response.text,
    });
  } catch (err: any) {
    console.error('Gemini insight error:', err.message);
    res.json({
      available: false,
      error: err.message,
    });
  }
});

export default router;
