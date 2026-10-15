# LabelLens — AI-Powered Food Scanner

> **"Know what's in your food."**  
> A production-grade College FED (Front-End Development) MERN application designed to help consumers understand packaged food ingredients, compare nutrition, uncover industrial ultra-processing, detect personal allergens, and discover verified healthier alternatives.

---

## 1. Architectural Highlights

- **Frontend**: React 19 SPA with TypeScript, Tailwind CSS v4, Lucide icons, responsive mobile/desktop design.
- **Backend**: Express.js REST API running on Node.js v22.
- **Database**: MongoDB with Mongoose object modeling (`User` schema with dietary profiles, history, and favorites), plus an automatic resilient in-memory storage adapter for zero-configuration out-of-the-box evaluations.
- **Authentication**: Salted password hashing with `bcryptjs`, session-safe stateless JSON Web Tokens (`jsonwebtoken`), and client-side Bearer authorization header injection.
- **External Data Source**: Live Open Food Facts API v2 integration with Indian and international brand coverage, complemented by a curated FSSAI-verified backup catalog for sub-second offline reliability.
- **AI Engine**: Google Gemini API (`@google/genai`) for deep consumer food science insights and additive breakdown.

---

## 2. Environment Variables

Create a `.env` file in the project root:

```env
# Application Port
PORT=3000

# MongoDB Connection String (MongoDB Atlas URI or local instance)
# Format: mongodb+srv://<username>:<password>@cluster0.mongodb.net/labellens?retryWrites=true&w=majority
MONGODB_URI="mongodb://localhost:27017/labellens"

# JWT Secret for password authentication and session management
JWT_SECRET="labellens_secure_jwt_secret_college_fed_fed2026"

# Optional: Google Gemini API Key for AI food science insights
GEMINI_API_KEY="your_gemini_api_key_here"

# APP_URL: Injected automatically by AI Studio at runtime
APP_URL="http://localhost:3000"
```

---

## 3. Local Setup & Execution Instructions

### Prerequisites
- Node.js >= 20.x
- npm >= 9.x
- (Optional) Local MongoDB server or MongoDB Atlas cluster URI

### Step 1: Clone and Install Dependencies
```bash
git clone <repository-url>
cd labellens
npm install
```

### Step 2: Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```
*(If `MONGODB_URI` is omitted or local MongoDB is not running, LabelLens will automatically activate its internal resilient Mongoose storage adapter, enabling all user profiles, login, and favorites to work seamlessly without crashing!)*

### Step 3: Run the Application
In development:
```bash
npm run dev
```
In production:
```bash
npm run build
npm start
```
The application will be live at `http://localhost:3000`.

---

## 4. Key Functional Modules

### A. Barcode Scanner & Manual Lookup
- Uses device camera stream via `html5-qrcode` with camera switching.
- Allows instant manual barcode entry.
- Preloaded with verified test products:
  - `8901058862392`: Maggi 2-Minute Masala Noodles (Nestlé)
  - `8906109960012`: Slurrp Farm Millet Noodles (Foxtail & Little Millet)
  - `8901491365412`: Doritos Cheese Supreme Nacho Chips
  - `8904004400123`: Cornitos Nacho Crisps (Gluten Free)
  - `8901491101836`: Parle-G Original Gluco Biscuits
  - `8901063012218`: Britannia NutriChoice Digestive High Fibre
  - `8801043002883`: Nongshim Shin Ramyun Spicy Ramen
  - `8906082520012`: Epigamia Greek Yogurt (High Protein)
  - `7622201124567`: Cadbury Dairy Milk Chocolate

### B. Transparent Health Score (0-100)
- Calculated using FSSAI guidelines, Nutri-Score nutrient density algorithms, and NOVA processing penalties:
  - **Baseline**: 60 points
  - **Positive Points**: Protein (+5 to +15 pts), Dietary Fibre (+8 to +15 pts), Low Sugar (+8 pts), Low Sodium (+6 pts), NOVA 1 whole food (+10 pts)
  - **Deductions**: Excessive Sugar (-12 to -22 pts), High Sodium (-10 to -20 pts), High Saturated Fat (-6 to -14 pts), High Calorie Density (-8 pts), NOVA 4 Ultra-processing (-12 pts)
- An interactive **Health Score Ledger** modal itemizes every single point addition and deduction.

### C. Allergen Alerts (Red / Amber / Green)
- Checks user-declared allergies against ingredients list, official allergen tags, and cross-contamination traces.
  - **RED**: Allergen match found (e.g. explicit label listing or synonym match like whey/casein for milk).
  - **AMBER**: Incomplete or ambiguous manufacturer declarations.
  - **GREEN**: No match detected, paired with an explicit mandatory packaging disclaimer.
- Allergy alerts take strict precedence over health scores.

### D. Healthier Alternatives Engine
- Finds up to 6 suitable products in the exact same food category.
- Evaluates per-100g nutrient deltas (sugar, sodium, protein, fibre).
- Highlights concrete trade-offs (e.g., lower sodium but slightly higher saturated fat).
- Strictly filters out products conflicting with user allergies.

### E. Health-Check Endpoint
```http
GET /api/health
```
Returns system runtime status, MongoDB connectivity, and Open Food Facts API latency.
