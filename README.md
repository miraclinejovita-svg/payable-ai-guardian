# PayAble AI Guardian

> **Voice-First Payment Safety & Intent Verification Assistant**  
> Built for blind and visually impaired users to verify payment intentions before funds are transferred.

---

## Architecture Overview

PayAble AI Guardian operates on a **zero-trust AI defense-in-depth model**:

1. **User Intention**: User expresses payment intention via spoken voice (Web Speech API) or accessible typed input.
2. **AI Natural Language Extraction**: Natural language text is processed by a server-side AI model (**Google Gemini** `gemini-2.5-flash` with native structured JSON schema).
3. **Strict Runtime Schema Validation**: AI output is parsed and verified by Zod before reaching any business logic.
4. **Deterministic `IntentMatch` Engine**: A standalone, pure TypeScript engine compares the intention against the backend's trusted, immutable order record.
   - Computes integer minor units (paise/cents) to eliminate floating-point drift.
   - Enforces exact merchant, amount, and currency agreement.
   - Blocks any overcharge, merchant mismatch, or ambiguity.
   - **Rule**: AI output *never* authorizes a transaction or overrides a mismatch.
5. **Explicit Review & Audio Feedback**: Screen reader live announcements (`aria-live`) and speech synthesis read the verified details. The user must explicitly confirm before checkout proceeds.
6. **PayPal Sandbox (Phase 5)**: Server-side order creation and server-to-server capture verification via PayPal REST Orders v2 API (Sandbox only).

---

## Payment Workflow (Phase 5)

```
User confirms intent
        │
        ▼
POST /api/payments/create-order   ← only orderId sent from frontend
        │  Backend fetches trusted order (amount, currency, merchant)
        │  Creates PayPal Sandbox order server-side
        │  Stores session mapping (paypalOrderId → applicationOrderId)
        ▼
PayPal Buttons SDK (buyer approval popup)
        │  Buyer logs in with Sandbox test account
        │  Buyer reviews and approves
        ▼
POST /api/payments/capture
        │  Backend verifies session ownership
        │  Acquires capture lock (prevents duplicate/concurrent captures)
        │  Calls PayPal capture endpoint server-to-server
        │  Verifies returned amount & currency match trusted order
        │  Returns COMPLETED only if all checks pass
        ▼
Frontend shows verified result (or error state)
```

**Security invariants (never violated):**
- `PAYPAL_CLIENT_SECRET` is never sent to the frontend, browser responses, logs, or chat.
- The frontend never provides authoritative amounts, currencies, or merchant names.
- PayPal redirect/callback alone ≠ payment success. Only a server-verified `COMPLETED` capture counts.
- If the session mapping is missing (e.g. after server restart), the backend fails closed with `SESSION_NOT_FOUND`.
- Network timeout during capture sets status to `UNKNOWN` — not success, not retried blindly.

---

## Demo Orders

| ID | Merchant | Amount | Sandbox Support |
|----|----------|--------|----------------|
| Order A | Maya Stores | INR 500.00 | ❌ INR discontinued by PayPal REST API v2 (April 2021) |
| Order B | Tech Essentials | INR 1,200.00 | ❌ INR discontinued |
| **Order C** | **Global Software & Tech** | **USD 15.00** | **✅ Full Sandbox checkout supported** |

> To test live PayPal Sandbox checkout, select **Order C (USD 15.00)** and configure real sandbox credentials.

---

## Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Install Dependencies
```powershell
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### Configure Environment Variables

**Backend** (`server/.env`):
```powershell
cp server/.env.example server/.env
```
Open `server/.env` and configure:

```env
# AI Provider (optional — offline fallback works without a key)
AI_PROVIDER=real_gemini
GEMINI_API_KEY=your_actual_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# PayPal Sandbox (optional — UI shows setup instructions if not configured)
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
```

> **Security**: `server/.env` is in `.gitignore` and must NEVER be committed. Never paste secrets in chat, logs, or GitHub.

---

## Phase 4: Gemini AI Integration Setup

1. **Obtain a Gemini API Key**:
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Sign in and click **Create API Key**.
   - Free tier available (rate limited: ~15 RPM on free tier).

2. **Set in `server/.env`**:
   ```env
   AI_PROVIDER=real_gemini
   GEMINI_API_KEY=AIzaSy...your_actual_key
   GEMINI_MODEL=gemini-2.5-flash
   ```

3. If no valid key is configured, the app uses the labeled `OFFLINE_DEMO_PARSER` fallback automatically.

---

## Phase 5: PayPal Sandbox Setup

1. **Create a PayPal Developer account** at [developer.paypal.com](https://developer.paypal.com)

2. **Create a Sandbox App**:
   - Dashboard → My Apps & Credentials → Sandbox → Create App
   - Copy the **Client ID** and **Secret**

3. **Create a Sandbox personal account** (buyer):
   - Dashboard → Testing → Sandbox Accounts → Create Account → Personal
   - Note the email and password — use these to log in during test checkout

4. **Add to `server/.env`**:
   ```env
   PAYPAL_MODE=sandbox
   PAYPAL_CLIENT_ID=<your sandbox client id>
   PAYPAL_CLIENT_SECRET=<your sandbox client secret>
   PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
   ```

5. **Test checkout flow**:
   - Start both server and client
   - Select **Order C (Global Software & Tech — USD 15.00)**
   - Say or type: *"Pay Global Software and Tech 15 dollars for software license"*
   - After intent verification, proceed to checkout
   - Log in with your **Sandbox personal test account** (not your real PayPal)
   - Approve the payment
   - The backend captures and verifies server-to-server

> **Note**: This is Sandbox only. No real money is transferred. The PayPal buttons show a "Sandbox/Test" notice throughout.

---

## Running Locally

### Start the Backend API (Port 4000)
```powershell
cd server
npm run dev
```

### Start the Frontend Client (Port 5173)
```powershell
cd client
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Running Automated Tests

### Backend Test Suite (36 tests — all mocked)

```powershell
cd server
npm test
```

| File | Tests | Coverage |
|------|-------|----------|
| `intentMatch.test.ts` | 6 | MATCH, MISMATCH, BLOCKED, NEEDS_CLARIFICATION, integer arithmetic |
| `aiService.test.ts` | 9 | AI structured output, Zod validation, timeouts, outages |
| `api.test.ts` | 9 | Health, orders, intent verify, error handling |
| `paypalService.test.ts` | 12 | OAuth, order creation, verified capture, discrepancy, idempotency, locking, fail-closed, cancellation |

> **All 36 tests use mocked HTTP** (no real PayPal or Gemini calls). They verify logic, security invariants, and error handling in isolation.

### Frontend Test Suite (10 tests)

```powershell
cd client
npm test
```

Tests cover: keyboard navigation, `aria-live` announcers, high contrast mode, offline safety engine.

### Production Builds (TypeScript)

```powershell
# Backend
cd server && npm run build   # tsc → dist/

# Frontend
cd client && npm run build   # tsc + vite → dist/
```

---

## Known Limitations

| Limitation | Detail |
|------------|--------|
| **In-memory session store** | `paymentSessionStore` is in-memory only. Active sessions are lost on server restart. The backend fails closed — capture attempts for unknown sessions return `SESSION_NOT_FOUND`. A production deployment requires a persistent ACID store (e.g. PostgreSQL + Redis). |
| **INR not supported** | PayPal REST API v2 discontinued domestic INR processing (April 2021). Orders A and B (INR) will show a clear currency limitation message. Only Order C (USD) supports live Sandbox checkout. |
| **Sandbox only** | The PayPal base URL is hardcoded to `https://api-m.sandbox.paypal.com`. Live PayPal endpoints are strictly prohibited. |
| **Single server instance** | The session store and capture lock are in-process. This design is suitable for hackathon demos, not multi-instance production deployments. |
| **`act()` warnings in frontend tests** | Cosmetic async warnings from `checkHealth()` in `useEffect`. All 10 tests pass. These do not affect production behavior. |

---

## Security Notes

- AI output is treated as **untrusted natural language extraction only**. It never authorizes payments or modifies order data.
- `PAYPAL_CLIENT_SECRET` is never included in any API response, frontend bundle, log, or chat.
- Amounts and currencies are always taken from the **backend's authoritative `OrderService`** — the frontend never supplies them.
- Duplicate capture attempts are blocked by an in-process capture lock with idempotency key tracking.
- PayPal redirect/approval callback alone is not treated as payment confirmation — only a server-verified `COMPLETED` capture qualifies.

---

## License
MIT License — Copyright (c) 2026 PayAble AI Guardian Contributors.
