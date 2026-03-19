# Quickstart: UK Bank CSV Budget Tracker

**Branch**: `001-csv-budget-tracker`
**Target browser**: Chrome 89+ or Edge 89+ (File System Access API required)

---

## Prerequisites

- Node.js 20 LTS or later
- npm 10+
- Chrome or Edge (for File System Access API)

---

## Initial Project Setup

The app is a Vite + React + TypeScript static SPA. Run from the repository root:

```bash
npm create vite@latest . -- --template react-ts
npm install
```

Then install approved dependencies:

```bash
# Approved stack only — no additions without constitution amendment
npm install recharts papaparse
npm install -D tailwindcss postcss autoprefixer @types/papaparse
npx tailwindcss init -p
```

Install testing tooling:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

---

## Running the App

```bash
npm run dev        # development server (Vite, hot reload)
npm run build      # production build → dist/
npm run preview    # preview production build locally
```

The app opens at `http://localhost:5173`. **Must use Chrome or Edge** — Firefox and Safari do not support the File System Access API.

---

## Running Tests

```bash
npm test           # run all Vitest tests (watch mode)
npm run test:run   # single pass (CI mode)
npm run test:coverage  # coverage report
```

Tests live in `tests/unit/` and `tests/integration/`. Financial logic tests in `tests/unit/services/` must be written **before** implementation (TDD, Principle III).

---

## First Use (App Flow)

1. Open the app in Chrome or Edge.
2. Click **Choose Folder** — grant permission to a local folder (e.g. `~/Documents/budget/`).
3. The app creates `budget-ledger.csv` in that folder with the `meta`, `Household` person, and all default categories pre-seeded.
4. Click **Import** → select a Nationwide or NewDay CSV file.
5. Review the staged transactions; confirm import.
6. Navigate to **Monthly Summary** to see categorised spend.

---

## Deploying to GitHub Pages / Netlify / Vercel

The production build is a fully static site in `dist/`. No server configuration needed.

**GitHub Pages** (`vite.config.ts` — set `base` to your repo path):
```typescript
export default defineConfig({
  base: '/speckit-budgeting-app/', // adjust to repo name
  plugins: [react()],
})
```

```bash
npm run build
# deploy dist/ to gh-pages branch
```

**Netlify / Vercel**: Point build command to `npm run build`, publish directory to `dist/`.

---

## Key Configuration Files

| File | Purpose |
|---|---|
| `vite.config.ts` | Build config; set `base` for deployment subdirectory |
| `tailwind.config.js` | Tailwind CSS content paths |
| `vitest.config.ts` | Test runner config (`environment: 'jsdom'`) |
| `tsconfig.json` | TypeScript strict mode enabled |
| `.eslintrc.cjs` | ESLint + TypeScript rules |

---

## Project Layout (src/)

```
src/
├── components/      # React UI components (import, categories, budgets, summaries, …)
├── services/        # Business logic with no React deps (parser, ledger, categoriser, …)
├── models/          # TypeScript interfaces for all 6 ledger record types
├── hooks/           # React hooks (useFilter, useLedger, usePeople, …)
├── store/           # SessionContext (date filter, person filter, ledger handle)
└── utils/           # Pence formatting, date helpers, WebCrypto hashing
```

Full layout with subfolders is in `plan.md` → Project Structure.

---

## Adding a New Bank Format

1. Open the running app → **Settings → Format Profiles → Add**.
2. Upload a sample CSV; use the column mapping UI to assign columns.
3. Save the profile — it is written as a `formatProfile` record to the master ledger.
4. On the next import from that bank, the profile is detected automatically.

**No code change required** (Principle VI).
