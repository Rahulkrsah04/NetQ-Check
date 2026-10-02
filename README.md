# LegalMetriX

**Smart Compliance for Packaged Commodities**

> Scan. Verify. Comply.

A professional web application for checking compliance of packaged commodity labels under the **Legal Metrology (Packaged Commodities) Rules, 2011** (India).

---

## Features

- **OCR-powered label scanning** — Upload or capture product label images
- **Rule-based compliance engine** — Check against configurable Legal Metrology requirements
- **Instant compliance reports** — Detailed field-by-field assessment
- **PDF report download** — Professional printable compliance report
- **Scan history** — Filter and search past scans
- **Demo mode** — Works fully offline with mock OCR data

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Charts | Recharts |
| OCR | Tesseract.js (or Mock) |
| PDF | jsPDF |
| Auth | Firebase Auth (demo mode available) |
| Database | Firebase Firestore (demo mode available) |
| Backend | Node.js + Express |

---

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd legalmetrix
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your Firebase credentials (optional for demo)
```

### 3. Run the frontend

```bash
npm run dev
# Opens at http://localhost:5173
```

### 4. Run the backend (optional)

```bash
cd server
npm install
node server.js
# Runs at http://localhost:3001
```

---

## Demo Mode

The application runs in **demo mode** by default without any Firebase credentials:

- **OCR**: Uses Mock OCR service with realistic demo data
- **Auth**: Accepts any email with 6+ character password
- **Database**: Uses local demo data (5 products)

To enable real Firebase: set `VITE_USE_FIREBASE=true` in `.env` with valid credentials.

To enable Tesseract OCR: set `VITE_OCR_PROVIDER=tesseract` in `.env`.

---

## Demo Flow

1. Visit `http://localhost:5173`
2. Click **Login** → use any email / any password (6+ chars)
3. Navigate to **Dashboard** → see compliance overview
4. Click **Scan Product** → upload any image
5. Wait for Mock OCR processing → review extracted data
6. Click **Run Compliance Check** → view detailed result
7. Click **Download PDF** → get compliance report
8. Visit **Scan History** → see all past scans

---

## Compliance Rules

Rules are based on the **Legal Metrology (Packaged Commodities) Rules, 2011** under the Legal Metrology Act, 2009 (India). The rules are configurable in:

```
src/data/complianceRules.js
```

---

## Project Structure

```
src/
  components/
    navigation/   — Navbar, Sidebar
    ui/           — Button, StatusBadge, ProgressStepper, UploadBox
  contexts/       — AuthContext (demo auth)
  config/         — Firebase config
  data/           — Mock data, compliance rules
  hooks/          — useOCR
  layouts/        — PublicLayout, DashboardLayout
  pages/          — All 10 pages
  services/       — OCR service, compliance engine, PDF report

server/
  routes/         — scan, reports
  server.js       — Express server
```

---

## Legal Disclaimer

This system provides automated preliminary compliance screening based on available image/text information. Final legal determination requires verification against the applicable Legal Metrology (Packaged Commodities) Rules, 2011, and where necessary, manual inspection by a qualified Legal Metrology Officer.

**LegalMetriX is not a legal authority.**
