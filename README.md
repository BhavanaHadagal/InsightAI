# InsightAI — AI-Powered Excel & CSV Analytics Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**InsightAI** is a full-stack, enterprise-grade AI analytics platform designed to analyze Excel (`.xlsx`, `.xls`) and CSV (`.csv`) spreadsheets. It computes deterministic mathematical metrics, renders interactive visual charts, provides natural language chat grounded in your data, generates AI-powered executive summaries, and exports publication-ready PDF and CSV reports.

---

## 🌟 Key Features

1. **Enterprise Authentication**:
   - Secure email and password registration with password strength meter, email normalization, and bcrypt hashing (work factor 12).
   - Google OAuth 2.0 integration via Passport.js with account linking protections.
   - Express session management backed by MongoDB session store with secure HTTP-only cookies and automatic session regeneration.
   - Secure token-based password reset flow with 1-hour expiry.

2. **Spreadsheet Processing & Safety**:
   - Supports `.xlsx`, `.xls`, and `.csv` files up to 25 MB.
   - Multi-sheet workbook detection and sheet switcher.
   - Server-side parsing with SheetJS (`xlsx`) with formula sanitization to prevent CSV/formula injection.
   - Automatic column classification: `numeric`, `categorical`, `date`, `boolean`.
   - Data quality auditing: empty row trimming, missing cell detection, and duplicate row detection.
   - Built-in sample supermarket dataset (`supermarket_sales_ai_analyzer.xlsx`) with 1-click loading.

3. **Deterministic Analytics Engine**:
   - Precise arithmetic calculations computed deterministically (no AI hallucinations for basic numbers).
   - Numeric statistics: Sum, Mean, Median, Min, Max, Standard Deviation, Q1, Q3, and IQR-based Outlier detection.
   - Categorical distributions: Frequency counts and percentage shares.
   - Time trends: Automatic time-series grouping by date.
   - Correlation Matrix: Pearson correlation coefficients between numeric variables.

4. **Dynamic Visualizations & UI**:
   - High-contrast SaaS aesthetic with deep navy sidebar (`#0f172a`) and slate/blue accents.
   - Interactive charts powered by Recharts: **Line Chart**, **Bar Chart**, **Area Chart**, and **Pie/Donut Chart**.
   - User-selectable dimension and metric dropdowns.
   - Searchable, sortable, and paginated data table.

5. **AI Insights & Conversational Chat**:
   - Server-side LLM integration supporting Google Gemini or any OpenAI-compatible provider (OpenAI, OpenRouter, Groq, Ollama, etc.).
   - Automatic Executive Summary generation covering patterns, anomalies, and strategic recommendations.
   - Natural language Q&A assistant grounded in computed metrics with prompt-injection defense.
   - Clear indicators when API keys are not yet configured (no fake responses).

6. **Reporting & Exporting**:
   - Publication-ready PDF generation using `pdfkit`.
   - Raw records export to CSV.
   - Printable report view with CSS print styling.

---

## 🛠️ Technology Stack

- **Frontend**:
  - React.js (v18) with Vite
  - Tailwind CSS & Tailwind Typography
  - React Router DOM (v6)
  - Recharts for dynamic charting
  - Lucide React for modern iconography
  - Axios with interceptors
- **Backend**:
  - Node.js & Express.js
  - MongoDB & Mongoose
  - Passport.js & `passport-google-oauth20`
  - `express-session` & `connect-mongo`
  - SheetJS (`xlsx`) for spreadsheet processing
  - Multer for multi-part file handling
  - Zod for request schema validation
  - Bcrypt.js for cryptographic hashing
  - PDFKit for server-side report generation
  - Nodemailer for transactional emails

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** (v9+) or **yarn** / **pnpm**
- **MongoDB**: A running local MongoDB instance (`mongodb://localhost:27017/insightai`) or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) URI.

### 2. Installation

Install all backend and frontend dependencies from the root:
```bash
# Install root dependencies and both client and server packages
npm run install:all
```
Or manually:
```bash
cd server && npm install
cd ../client && npm install
```

### 3. Environment Configuration

Copy the example environment configuration in `server/`:
```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your parameters:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000

# MongoDB Connection (Local or Atlas URI)
MONGODB_URI=mongodb://localhost:27017/insightai

# Session Secret (min 32 characters)
SESSION_SECRET=insightai_super_secret_session_key_replace_in_production_32chars

# Google OAuth 2.0 Credentials (Optional)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# AI Provider Configuration (Optional, Gemini or OpenAI compatible)
AI_API_KEY=your_gemini_or_openai_api_key_here
AI_MODEL=gemini-1.5-flash
AI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/

# SMTP Configuration (Optional, for password reset emails)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=no-reply@insightai.local
```

### 4. Running in Development

In two separate terminals:

**Terminal 1 (Backend Server):**
```bash
cd server
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Client starts at http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## 🔑 External Services Configuration

### 1. Google OAuth 2.0 Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `InsightAI-Analytics`).
3. Navigate to **APIs & Services > OAuth consent screen**.
   - Choose **External** user type.
   - Fill in the App name (`InsightAI`) and developer contact email.
   - Add the scopes: `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
4. Navigate to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Name: `InsightAI Web Client`.
   - **Authorized JavaScript origins**: `http://localhost:5173` and `http://localhost:5000`.
   - **Authorized redirect URIs**: `http://localhost:5000/api/auth/google/callback` (Must match `GOOGLE_CALLBACK_URL` in `server/.env`).
5. Copy your **Client ID** and **Client Secret** into `server/.env`.

### 2. AI Provider Setup (Gemini / OpenAI)
InsightAI supports any OpenAI-compatible endpoint.

#### Using Google Gemini:
1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. Set in `server/.env`:
   ```env
   AI_API_KEY=your_gemini_api_key
   AI_MODEL=gemini-1.5-flash
   AI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
   ```

#### Using OpenAI:
```env
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
AI_API_BASE_URL=https://api.openai.com/v1/
```

### 3. SMTP Setup for Password Reset
For development testing, you can use [Mailtrap](https://mailtrap.io/):
```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASSWORD=your_mailtrap_pass
EMAIL_FROM=no-reply@insightai.local
```
*Note: If SMTP is not configured, the password reset endpoint will output a direct password reset link in the API response and server console for zero-friction development!*

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user with email & password |
| `POST` | `/api/auth/login` | Authenticate user & establish session |
| `POST` | `/api/auth/logout` | Terminate session & clear cookies |
| `GET` | `/api/auth/me` | Fetch currently authenticated user |
| `GET` | `/api/auth/google` | Initiate Google OAuth 2.0 flow |
| `GET` | `/api/auth/google/callback` | OAuth callback handler |
| `POST` | `/api/auth/forgot-password` | Request password reset token |
| `POST` | `/api/auth/reset-password` | Complete password reset with token |

### Datasets
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/datasets/upload` | Upload `.xlsx` / `.csv` file & run analysis |
| `POST` | `/api/datasets/sample` | Load 1-click supermarket demo dataset |
| `GET` | `/api/datasets` | List all datasets owned by current user |
| `GET` | `/api/datasets/:id` | Get dataset metadata & summary |
| `PATCH` | `/api/datasets/:id` | Rename dataset |
| `DELETE` | `/api/datasets/:id` | Delete dataset & analysis history |
| `GET` | `/api/datasets/:id/preview` | Paginated, searchable data table records |

### Analysis & AI
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/datasets/:id/analyze` | Synthesize full AI executive insights |
| `GET` | `/api/datasets/:id/analysis` | Fetch computed stats & saved insights |
| `POST` | `/api/datasets/:id/chat` | Send natural language question to AI |
| `GET` | `/api/datasets/:id/history` | Retrieve previous analysis & chat logs |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/datasets/:id/export/csv` | Download dataset records as CSV |
| `GET` | `/api/datasets/:id/export/pdf` | Generate publication-ready PDF report |

---

## 🧪 Verification & Testing

To run backend deterministic unit & verification tests:
```bash
node server/test-verify.js
```
Expected output:
```
✓ Parsed 150 rows, 17 columns from Sales_Transactions
✓ KPIs computed: Total Records = 150, Primary Metric = Total
✓ Primary Value Total = 45879.75, Avg = 305.87
✓ Numeric Stats: 8 numeric columns analyzed with IQR outliers
✓ Categorical Stats: 7 categorical dimensions grouped
✓ Correlations: 28 numeric pairs calculated
✓ Bcrypt hashing and comparison verified
```

To build client bundle for production:
```bash
cd client && npm run build
```

---

## 🚢 Deployment

1. **Frontend**: Build the static assets using `cd client && npm run build`. The `dist/` folder can be served by any static host (Vercel, Netlify, Cloudflare Pages, S3) or served directly through Express via `express.static()`.
2. **Backend**: Deploy `server/` to platforms like Render, Railway, AWS ECS, or DigitalOcean App Platform.
3. Configure environment variables in your deployment dashboard and ensure `NODE_ENV=production` is set so secure cookie attributes (`secure: true`, `sameSite: 'none'`) are enabled.

---

## 📄 License
MIT © InsightAI Platform.

