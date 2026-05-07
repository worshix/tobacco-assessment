# TobaccoGuard — Tobacco Field Assessment System

A full-stack web application for satellite-based crop health monitoring of tobacco fields. Farmers draw their field boundaries on an interactive map, and the system fetches **real satellite NDVI values from Google Earth Engine** plus live weather data to classify crop health, generate a spatial NDVI heatmap, and produce plain-language recommendations.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Installation & Setup](#2-installation--setup)
3. [Folder Structure](#3-folder-structure)
4. [Technology Stack](#4-technology-stack)
5. [Database Schema](#5-database-schema)
6. [Pages & User Interface](#6-pages--user-interface)
7. [Maps & Geospatial System](#7-maps--geospatial-system)
8. [Data Pipeline — Satellite & Weather](#8-data-pipeline--satellite--weather)
9. [Machine Learning Model](#9-machine-learning-model)
10. [Recommendation Engine](#10-recommendation-engine)
11. [API Routes](#11-api-routes)
12. [Authentication](#12-authentication)
13. [End-to-End User Flow](#13-end-to-end-user-flow)

---

## 1. Project Overview

**TobaccoGuard** addresses a practical problem in smallholder tobacco farming: detecting crop stress early without expensive field inspections. The system:

1. Lets a farmer register and draw their field boundary on a satellite map.
2. Queries **Google Earth Engine** (via the REST API v1) for real Sentinel-2 NDVI values over the field polygon across five 30-day historical periods.
3. Fetches live weather data (temperature and rainfall) from the **Open-Meteo** API.
4. Runs a trained **Logistic Regression classifier** to predict crop health status.
5. Renders an **NDVI heatmap** overlaid on the field polygon — showing crop stress hotspots — using per-point GEE queries across a 5×5 grid.
6. Applies a rule-based engine to generate actionable recommendations.

> **No synthetic or estimated NDVI data is used in production.** All vegetation index values are computed from real Sentinel-2 (S2_SR_HARMONIZED) imagery via Google Earth Engine. A fallback to estimated values only activates if GEE credentials are missing or the API is unreachable.

---

## 2. Installation & Setup

### Prerequisites

- Node.js 20+
- pnpm
- A Google Cloud project with the **Earth Engine API** enabled
- A GEE-authorised **service account** with a JSON private key
- Python 3.13+ with `uv` — only needed to retrain the ML model, not to run the app

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# SQLite database
DATABASE_URL="file:./dev.db"

# Google Earth Engine service account
GEE_SERVICE_ACCOUNT_EMAIL="your-sa@your-project.iam.gserviceaccount.com"
GEE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GEE_PROJECT_ID="your-gcp-project-id"
```

`GEE_PRIVATE_KEY` must be the full RSA private key from the service account JSON, with newlines encoded as `\n`.

### 3. Run database migrations

```bash
pnpm dlx prisma migrate dev
```

This creates `dev.db` and applies all migrations, including the cascade-delete relationships.

### 4. Start the development server

```bash
pnpm dev
```

Visit `http://localhost:3000`.

### 5. Verify GEE connectivity (optional)

```bash
node scripts/test-gee.mjs
```

This runs two end-to-end GEE API tests — one polygon NDVI query (satellite path) and one point NDVI query (heatmap path) — and prints the raw result values.

### Re-train the ML model (optional)

```bash
cd models
uv sync
cd src
python train_health_model.py
python export_model.py
```

Regenerates `models/models/crop_health_model.json`. A rebuild (`pnpm build`) is required to pick up the change in production.

---

## 3. Folder Structure

```text
tobacco-assessment/
│
├── app/                            # Next.js App Router (pages + API routes)
│   ├── layout.tsx                  # Root HTML layout, fonts, metadata
│   ├── page.tsx                    # Landing page (public)
│   ├── globals.css                 # Global Tailwind styles
│   │
│   ├── auth/
│   │   ├── login/page.tsx          # Login form
│   │   └── signup/page.tsx         # Registration form
│   │
│   ├── dashboard/
│   │   └── page.tsx                # Authenticated home — field cards
│   │
│   ├── field/
│   │   ├── create/page.tsx         # Map-based field creation
│   │   └── [fieldId]/
│   │       ├── page.tsx            # Field overview (map + details)
│   │       └── analyse/
│   │           └── page.tsx        # Analysis results + NDVI heatmap
│   │
│   └── api/                        # Next.js API routes (server-side)
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   └── signup/route.ts
│       ├── field/
│       │   ├── route.ts            # POST: create field
│       │   └── [fieldId]/route.ts  # DELETE: remove field (cascade)
│       ├── analyse/route.ts        # POST: run full analysis pipeline
│       ├── gee/route.ts            # POST: GEE value:compute proxy
│       └── heatmap/route.ts        # POST: per-point NDVI grid for heatmap
│
├── components/                     # Reusable React components
│   ├── DeleteFieldButton.tsx        # Client component for field deletion
│   ├── LogoutButton.tsx             # Client component for logout
│   ├── Map/
│   │   ├── FieldMap.tsx             # SSR-safe dynamic wrapper for LeafletMap
│   │   ├── HeatmapLayer.tsx         # Leaflet.heat NDVI heatmap overlay
│   │   └── LeafletMap.tsx           # Full Leaflet map with drawing tools
│   └── ui/                          # shadcn/ui component library (Radix primitives)
│       ├── accordion.tsx
│       ├── alert.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       └── ... (30+ components)
│
├── lib/                            # Server-side business logic
│   ├── prisma.ts                   # Prisma client singleton
│   ├── utils.ts                    # Tailwind class merging utility
│   ├── analysis/
│   │   └── recommendations.ts      # Rule-based recommendation engine
│   ├── gee/
│   │   ├── auth.ts                 # GEE JWT authentication (service account → OAuth token)
│   │   ├── satellite.ts            # Polygon NDVI from GEE (5 historical periods) + weather
│   │   └── heatmap.ts              # Per-point NDVI grid from GEE (5×5 spatial heatmap)
│   ├── geo/
│   │   └── utils.ts                # Area calculation, centroid, reverse geocoding
│   └── ml/
│       └── inference.ts            # Logistic Regression inference in TypeScript
│
├── models/                         # Python ML training pipeline (offline)
│   ├── data/raw/dataset.csv        # 608-sample labelled training dataset
│   ├── src/
│   │   ├── config.py               # Paths and feature configuration
│   │   ├── feature_engineering.py
│   │   ├── labeling.py             # Rule-based label generation
│   │   ├── train_health_model.py   # Logistic Regression training script
│   │   └── export_model.py         # Exports weights to JSON for Next.js
│   ├── models/
│   │   ├── crop_health_model.json  # Exported coefficients (loaded by lib/ml/inference.ts)
│   │   ├── crop_health_model.joblib
│   │   └── thresholds.json
│   └── reports/
│       ├── training_summary.md
│       └── confusion_matrix.png
│
├── prisma/
│   ├── schema.prisma               # Database schema (SQLite + cascade deletes)
│   └── migrations/                 # Applied migration history
│
├── scripts/
│   ├── test-gee.mjs                # End-to-end GEE REST API smoke test
│   └── list-gee-algorithms.mjs     # Fetches GEE algorithm registry (dev utility)
│
├── hooks/                          # Custom React hooks
├── public/                         # Static assets
├── documents/                      # Project documentation and research paper
├── dev.db                          # SQLite database file
├── package.json
├── next.config.ts
└── prisma.config.ts
```

---

## 4. Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Maps | Leaflet.js + React-Leaflet + Leaflet-Draw |
| Heatmap | leaflet.heat |
| Charts | Recharts |
| Database | SQLite via Prisma ORM |
| Authentication | Cookie-based sessions + bcryptjs |
| Satellite Data | Google Earth Engine REST API v1 (Sentinel-2) |
| Weather API | Open-Meteo (free, no API key) |
| Geocoding | OpenStreetMap Nominatim (free, no API key) |
| ML Training | Python 3.13, scikit-learn, pandas, joblib |
| Package Manager | pnpm |

---

## 5. Database Schema

SQLite managed by Prisma. All relations use `onDelete: Cascade` — deleting a user removes all their fields and analyses; deleting a field removes all its analyses.

### `User`

| Field | Type | Description |
| --- | --- | --- |
| `id` | String (CUID) | Primary key |
| `name` | String | Full name |
| `email` | String (unique) | Login identifier |
| `password` | String | bcrypt hash |
| `createdAt` | DateTime | Registration timestamp |

### `Field`

| Field | Type | Description |
| --- | --- | --- |
| `id` | String (CUID) | Primary key |
| `name` | String | User-given field name |
| `cropType` | String | Default: `"Tobacco"` |
| `polygon` | String | GeoJSON stored as a JSON string |
| `area` | Float? | Auto-calculated area in hectares |
| `location` | String? | Reverse-geocoded place name |
| `userId` | String | Foreign key → User (cascade delete) |

### `Analysis`

| Field | Type | Description |
| --- | --- | --- |
| `id` | String (CUID) | Primary key |
| `fieldId` | String | Foreign key → Field (cascade delete) |
| `meanNDVI` | Float | Mean NDVI from GEE (most recent 30-day period) |
| `ndviTrend` | Enum | `IMPROVING`, `STABLE`, or `DECLINING` |
| `healthStatus` | Enum | `HEALTHY`, `MODERATE_STRESS`, or `HIGH_STRESS` |
| `avgTemperature` | Float | 30-day mean temperature (°C) from Open-Meteo |
| `totalRainfall` | Float | 30-day total rainfall (mm) from Open-Meteo |
| `waterStressRisk` | Boolean | `true` if rainfall < 10mm AND NDVI < 0.45 |
| `diseaseRisk` | Boolean | `true` if NDVI variance > 0.05 |
| `rawData` | String | JSON blob (full NDVI series, weather, data source) |
| `recommendations` | String | JSON array of recommendation strings |

---

## 6. Pages & User Interface

### Landing Page — `/`

Public home page with a hero section, three benefits cards (health monitoring, stress detection, smart recommendations), and navigation to login/signup.

### Sign Up — `/auth/signup`

Registration form (name, email, password). On success: password hashed, session cookie set, redirect to `/field/create`.

### Login — `/auth/login`

Login form. On success: bcrypt verification, session cookie set, redirect to `/dashboard`.

### Dashboard — `/dashboard`

Server-rendered field list. Each card shows the field name, reverse-geocoded location, most-recent health badge (Healthy / Moderate / Stressed / No Data), and links to details and analysis.

### Create Field — `/field/create`

Split layout: a coordinate-navigation sidebar and a full-screen Leaflet map with the polygon drawing toolbar enabled. On save, the polygon GeoJSON is POSTed to the API, which calculates area and reverse-geocodes the centroid before storing the field.

### Field Overview — `/field/[fieldId]`

Read-only map displaying the saved polygon, field metadata cards (area, crop type, location), and a **Run Analysis** button.

### Analysis Results — `/field/[fieldId]/analyse`

Client component that fires the analysis API on mount. While loading: spinner with "Analysing Field…". Results are divided into:

- **Health status badge** — colour-coded (green / amber / red)
- **Smart recommendations** — plain-language cards
- **Risk flags** — Water Stress Risk, Disease Risk
- **Environment** — Average Temperature, Total Rainfall
- **NDVI Heatmap** — Leaflet.heat overlay showing spatial NDVI variation across the field (green = healthy, red = stressed)
- **Technical Data** (collapsible accordion) — mean NDVI value and a Recharts area chart of the five historical NDVI readings

---

## 7. Maps & Geospatial System

### Tile Layers

Two layers are stacked: **ESRI World Imagery** (high-resolution satellite base) and **Stamen Toner Labels** (place names and roads at 70% opacity).

### Polygon Drawing

Leaflet-Draw with only the polygon tool enabled. Polygons are styled with an emerald green fill at 40% opacity. Three events are captured: `onCreated`, `onEdited`, `onDeleted`.

### Coordinate Navigation

Latitude/longitude inputs on the Create Field page trigger Leaflet `flyTo` with a 1.5-second animation to zoom level 16.

### Area Calculation

Computed server-side in `lib/geo/utils.ts` using the Shoelace formula on equirectangular-projected coordinates, then converted to hectares.

### Reverse Geocoding

Polygon centroid is sent to OpenStreetMap Nominatim. The most specific available locality name (city → town → village → county → state → country) is stored in the `location` field.

### NDVI Heatmap

`HeatmapLayer.tsx` uses the **leaflet.heat** plugin. It receives an array of `{ lat, lng, ndvi }` points from `/api/heatmap` and renders them as a heat layer with intensity `1 − ndvi` (so low NDVI = hot/red, high NDVI = cool/green). The gradient is inverted: `{ 0.0: 'green', 0.5: 'yellow', 1.0: 'red' }`.

---

## 8. Data Pipeline — Satellite & Weather

### Google Earth Engine Integration

All NDVI data is fetched in real time from the **GEE REST API v1** `value:compute` endpoint using a service account JWT. The expression trees use GEE's internal algorithm registry names — which differ significantly from the Python/JS convenience API.

**Verified GEE function names (confirmed against live API):**

| Purpose | Internal function name |
| --- | --- |
| Load ImageCollection | `ImageCollection.load` |
| Create polygon geometry | `GeometryConstructors.Polygon` |
| Create point geometry | `GeometryConstructors.Point` |
| Filter collection | `Collection.filter` |
| Date ≥ filter | `Filter.greaterThanOrEquals` on `system:time_start` (ms) |
| Date < filter | `Filter.lessThan` on `system:time_start` (ms) |
| Mean reducer | `Reducer.mean` |
| Reduce collection → image | `ImageCollection.reduce` (arg: `collection`) |
| NDVI from bands | `Image.normalizedDifference` (arg: `input`) |
| Sample image over region | `Image.reduceRegion` (arg: `image`) |
| Extract value from dict | `Dictionary.get` |

After `ImageCollection.reduce`, band names gain a `_mean` suffix: `B8` → `B8_mean`, `B4` → `B4_mean`.

### Polygon NDVI (`lib/gee/satellite.ts`)

Queries GEE across **five consecutive 30-day periods** (150 days total, oldest → newest):

1. Load `COPERNICUS/S2_SR_HARMONIZED`
2. Filter to the date range via `system:time_start` ms comparisons
3. Filter to `CLOUDY_PIXEL_PERCENTAGE < 30`
4. Reduce the collection to a single mean image (`ImageCollection.reduce` + `Reducer.mean`)
5. Compute NDVI from `B8_mean` and `B4_mean` bands (`Image.normalizedDifference`)
6. Sample the mean NDVI over the polygon (`Image.reduceRegion` at 10m scale)
7. Extract the scalar value from the result dictionary (`Dictionary.get`, key `"nd"`)

The five period results produce the historical NDVI series shown in the analysis chart. The most recent period's value is used as `mean_ndvi`. The trend is `current − previous`.

### Point NDVI for Heatmap (`lib/gee/heatmap.ts`)

A 5×5 grid of points is generated inside the polygon using a ray-casting point-in-polygon test. For each interior point, the same GEE expression chain is run using `GeometryConstructors.Point` instead of a polygon, at 30m scale. All 25 queries run concurrently via `Promise.all`. The 90-day window centred on today is used.

### Weather Data (`lib/gee/satellite.ts` → `fetchWeatherData`)

```text
https://api.open-meteo.com/v1/forecast
  ?latitude=...&longitude=...
  &daily=temperature_2m_mean,precipitation_sum
  &past_days=30&forecast_days=0
```

- `avg_temperature_c` = mean of 30 daily values
- `total_rainfall_mm` = sum of 30 daily precipitation values
- Fallback: `{ avgTemp: 25, totalRain: 15 }` if the API is unreachable

### Feature Vector

Five features are assembled and passed to the ML model:

| Feature | Source |
| --- | --- |
| `mean_ndvi` | GEE Sentinel-2 (most recent 30-day period) |
| `ndvi_trend` | GEE — (period 5 NDVI) − (period 4 NDVI) |
| `ndvi_variance` | GEE — std deviation across the five periods |
| `avg_temperature_c` | Open-Meteo 30-day mean |
| `total_rainfall_mm` | Open-Meteo 30-day sum |

---

## 9. Machine Learning Model

### Algorithm: Logistic Regression

Multinomial Logistic Regression (`sklearn.linear_model.LogisticRegression`, `max_iter=1000`). Chosen because the coefficients can be exported as plain JSON and the entire inference re-implemented in a few lines of TypeScript — no Python runtime at inference time.

### Training Data

`models/data/raw/dataset.csv` — 608 synthetic samples, balanced across three classes. Labels were assigned by domain knowledge rules:

| Condition | Label |
| --- | --- |
| NDVI > 0.6, positive/stable trend, adequate rainfall | `HEALTHY` |
| NDVI 0.45–0.6, mild decline | `MODERATE_STRESS` |
| NDVI < 0.45, negative trend, high temperature, low rainfall | `HIGH_STRESS` |

Sample rows:

```csv
mean_ndvi,ndvi_trend,ndvi_variance,avg_temperature_c,total_rainfall_mm,crop_health_label
0.72,0.01,0.004,24.5,128.2,HEALTHY
0.41,-0.032,0.045,32.1,8.7,HIGH_STRESS
0.52,-0.005,0.015,28.3,35.6,MODERATE_STRESS
```

### Training Process (`models/src/train_health_model.py`)

1. Load `dataset.csv` with pandas
2. 80/20 train-test split (`random_state=42`)
3. Fit `LogisticRegression(max_iter=1000, random_state=42)`
4. Evaluate on test set — print classification report and save confusion matrix

### Model Export (`models/src/export_model.py`)

Converts the trained model to `models/models/crop_health_model.json`:

```json
{
  "model_type": "LogisticRegression",
  "features": ["mean_ndvi", "ndvi_trend", "ndvi_variance", "avg_temperature_c", "total_rainfall_mm"],
  "classes": ["HEALTHY", "HIGH_STRESS", "MODERATE_STRESS"],
  "coefficients": [[...], [...], [...]],
  "intercept": [-18.39, 0.97, 17.42]
}
```

### Training Performance

```text
                  precision    recall  f1-score   support

         HEALTHY       0.97      1.00      0.99        34
     HIGH_STRESS       1.00      0.94      0.97        48
 MODERATE_STRESS       0.93      0.97      0.95        40

        accuracy                           0.97       122
       macro avg       0.97      0.97      0.97       122
    weighted avg       0.97      0.97      0.97       122
```

**97% overall accuracy** on 122 held-out samples.

### TypeScript Inference (`lib/ml/inference.ts`)

Python is never called at runtime. The decision rule:

```text
For each class j:
  z_j = intercept[j] + Σ(coefficients[j][i] × feature[i])

Predict the class with the highest z_j
```

Returns one of: `"HEALTHY"`, `"MODERATE_STRESS"`, `"HIGH_STRESS"`.

---

## 10. Recommendation Engine

Rule-based engine in `lib/analysis/recommendations.ts`. Runs after ML prediction.

| Rule | Condition | Recommendation |
| --- | --- | --- |
| Water stress | NDVI < 0.45 AND rainfall < 10mm | Irrigation recommended |
| Declining crop | NDVI trend declining AND 0.45 ≤ NDVI ≤ 0.6 | Monitor for stress or disease |
| Stable/healthy | NDVI > 0.6 AND trend stable/improving | No immediate action required |
| Disease risk | NDVI variance > 0.05 AND temperature > 25°C | Inspect for disease or pests |
| Fallback | No rule fires | Continue routine observations |

Multiple rules can fire simultaneously, producing multiple cards on the results page.

---

## 11. API Routes

### `POST /api/auth/signup`

Creates user, hashes password (bcrypt 10 rounds), sets `userId` HTTP-only cookie (7-day).

### `POST /api/auth/login`

Verifies password hash, sets session cookie.

### `POST /api/auth/logout`

Clears session cookie.

### `POST /api/field`

Creates field — calculates area (Shoelace) and reverse-geocodes centroid (Nominatim).

### `DELETE /api/field/[fieldId]`

Deletes field and all its analyses (cascade). Enforces ownership.

### `POST /api/analyse`

Full analysis pipeline:

1. Authenticate via cookie
2. Fetch field (ownership enforced)
3. `getSatelliteData(polygon)` — 5 × 30-day GEE NDVI queries + Open-Meteo weather
4. `predictCropHealth(features)` — Logistic Regression inference
5. `getRecommendations(...)` — rule-based engine
6. Save `Analysis` record to database
7. Return JSON result

### `POST /api/heatmap`

Accepts a polygon GeoJSON. Calls `getSatelliteHeatmap(polygon)`, which queries GEE for NDVI at each point of a 5×5 interior grid (90-day window). Returns `{ lat, lng, ndvi }[]`.

### `POST /api/gee`

Thin proxy to `https://earthengine.googleapis.com/v1/projects/.../value:compute`. Adds the GEE Bearer token server-side.

---

## 12. Authentication

Cookie-based sessions (not JWT):

```http
Set-Cookie: userId=<cuid>; HttpOnly; Path=/; Max-Age=604800
```

- **HttpOnly** — inaccessible to JavaScript (XSS protection)
- **7-day expiry**

Every protected page and API route reads the cookie server-side via Next.js `cookies()`. Absence → redirect to `/auth/login` or `401 Unauthorized`. Passwords are stored as bcrypt hashes (10 salt rounds).

---

## 13. End-to-End User Flow

```text
1. Farmer visits / (landing page)
        ↓
2. Clicks "Get Started Now" → /auth/signup
   (password hashed, user created, cookie set)
        ↓
3. Redirected to /field/create
   Types field name, enters coordinates → map flies to location
   Draws polygon on satellite base layer using Leaflet-Draw
        ↓
4. Clicks "Save Field" → POST /api/field
   (area calculated via Shoelace, location reverse-geocoded via Nominatim)
        ↓
5. Redirected to /dashboard
   Field card appears with "No Data" health badge
        ↓
6. Clicks "Analyse" → /field/[fieldId]/analyse
        ↓
7. POST /api/analyse fires:
   ├── GEE REST API v1: 5 × NDVI queries over polygon (one per 30-day period)
   ├── Open-Meteo: 30 days of temperature + rainfall at field centroid
   ├── Logistic Regression inference (TypeScript, no Python)
   └── Rule-based recommendation engine
        ↓
8. POST /api/heatmap fires in parallel:
   └── GEE REST API v1: NDVI at each interior point of a 5×5 grid (90-day window)
        ↓
9. Results page renders:
   ├── Health status badge (Healthy / Moderate Stress / High Stress)
   ├── Smart recommendations (plain language)
   ├── Risk flags (Water Stress Risk, Disease Risk)
   ├── Environment cards (Temperature, Rainfall)
   ├── NDVI heatmap overlaid on the field polygon
   └── Collapsible technical data (NDVI chart, 5 historical periods)
        ↓
10. Farmer returns to /dashboard — field card now shows health status badge
```
