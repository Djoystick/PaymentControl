# Phase 30K - PaddleOCR Foundation + OCR Provider Refactor + Receipt Prefill Reliability

- Date: 2026-04-06
- Status: implemented, pending manual verification
- Scope: OCR architecture/reliability pass (no new UX-wave, no shell/domain redesign)
- Baseline preserved:
  - donation-only product truth (no premium/paywall return)
  - recurring/travel separation
  - Travel v1 baseline
  - modal-first grammar from 30C/30D
  - language model truth from 29A/29A.1
  - `save-now / parse-later` receipt truth

## 1) References Used

Before implementation this pass rechecked:
1. `docs/reports/payment_control_master_migration_anchor_post_29A1.md`
2. `docs/reports/internal_version_history.md`
3. `DESIGN.md`
4. `docs/reports/phase_30C_modal_surface_unification_header_deduplication_home_continuity_rollback_and_page_load_performance_fix.md`
5. `docs/reports/phase_30D_full_spoiler_elimination_and_project_wide_modal_disclosure_unification.md`
6. `docs/reports/phase_30H_travel_receipt_ocr_reliability_and_modal_viewport_regression_fix.md`
7. `docs/reports/phase_30I_ocr_operational_truth_and_receipt_draft_save_regression_fix.md`
8. `docs/reports/phase_30J_ocr_provider_diagnostics_and_error_mapping_hardening.md`
9. `.codex/skills/ui-ux-pro-max/SKILL.md`

How references were applied:
1. `DESIGN.md`: keep OCR as helper layer, avoid noisy technical UX, preserve clean modal flows.
2. `ui-ux-pro-max`: reliability-first error/fallback messaging and calm, non-chaotic OCR status presentation.
3. 30H/30I/30J: preserve receipt-draft stability and extend diagnostics/mapping instead of reworking UX shell.

## 2) OCR Architecture Audit (Before 30K)

Observed pre-30K structure:
1. OCR runtime in `src/lib/travel/receipt-ocr.ts` was strongly provider-bound to OpenAI call chain.
2. Provider diagnostics and route mapping were improved in 30J, but provider implementation was still monolithic.
3. No dedicated provider module boundary existed for adding a free self-hosted OCR backend.
4. Preprocessing as an explicit OCR stage was missing.
5. Draft flow (`create/save/reopen`) was already correctly independent from OCR and had to remain untouched.

Audit conclusion:
1. Core regression-risk area was provider coupling, not draft persistence.
2. Needed change: split OCR engine into pluggable providers + keep route/repository contracts stable.
3. Needed change: add safe preprocessing contract before provider call.

## 3) What Was Implemented

## 3.1 Provider abstraction introduced

New files:
1. `src/lib/travel/ocr/types.ts`
2. `src/lib/travel/ocr/provider-utils.ts`
3. `src/lib/travel/ocr/providers/paddle-provider.ts`
4. `src/lib/travel/ocr/providers/openai-provider.ts`

Implemented:
1. Shared OCR result/failure model (`TravelReceiptOcrResult`, failure kinds, provider identity).
2. Shared provider diagnostics helpers:
   - safe payload parsing
   - error category classifier
   - structured diagnostics logging without secrets
3. Provider-specific modules:
   - `paddle` (new primary target)
   - `openai` (legacy optional compatibility branch)

Result:
1. OCR route/repository can run through one stable OCR interface.
2. Provider logic is modular and replaceable.

## 3.2 `runTravelReceiptOcr` refactored to provider router

File:
1. `src/lib/travel/receipt-ocr.ts`

Implemented:
1. Provider resolution via env (`paddle` primary by default).
2. Provider availability check (`paddle` endpoint or `openai` key).
3. Single unavailable fallback message preserving parse-later model.
4. Provider call dispatch:
   - `runTravelReceiptOcrWithPaddle(...)`
   - `runTravelReceiptOcrWithOpenAi(...)`

Result:
1. OpenAI no longer defines OCR architecture as the only path.
2. Paddle is now the default integration target.

## 3.3 PaddleOCR integration foundation (self-hosted service wiring)

Files:
1. `src/lib/config/server-env.ts`
2. `src/lib/travel/ocr/providers/paddle-provider.ts`
3. `.env.example`

Added server env wiring:
1. `TRAVEL_RECEIPT_OCR_PROVIDER` (default expected: `paddle`)
2. `TRAVEL_RECEIPT_OCR_PADDLE_ENDPOINT`
3. `TRAVEL_RECEIPT_OCR_PADDLE_API_KEY` (optional)
4. `TRAVEL_RECEIPT_OCR_PADDLE_TIMEOUT_MS`
5. `TRAVEL_RECEIPT_OCR_PREPROCESS_PROFILE`

Paddle provider behavior:
1. Sends image + preprocessing hints + trip currency to configured endpoint.
2. Supports optional auth headers (`Authorization`, `x-api-key`).
3. Uses timeout + abort controller.
4. Maps transport/status/payload failures to existing OCR error taxonomy.
5. Accepts either:
   - structured suggestion payload, or
   - text-first OCR payload (with local heuristic prefill derivation).

Result:
1. After external Paddle service is manually deployed, app wiring is ready without another architecture wave.

## 3.4 Preprocessing layer added

File:
1. `src/lib/travel/ocr/preprocess.ts`

Implemented:
1. Safe data URL normalization/validation for OCR parse path.
2. Explicit preprocessing profile/hints contract passed to provider:
   - orientation normalize
   - grayscale
   - contrast boost
   - adaptive threshold
   - deskew
   - receipt crop hint
   - max side hint
3. Graceful preprocessing failure path with clear retry guidance.

Important note:
1. This pass adds preprocessing orchestration/hints (safe for current stack).
2. Heavy pixel transforms are expected to run in the external OCR service (manual infra layer), not in Next.js runtime.

## 3.5 OCR UX/error copy hardening for provider-agnostic messaging

File:
1. `src/lib/i18n/localization.tsx`

Added/updated RU mapping for:
1. provider-agnostic unavailable/setup message
2. provider authentication failure
3. provider model/engine unavailability
4. provider quota/billing limit
5. provider endpoint/connectivity failure
6. preprocessing failure

Result:
1. User-facing errors are less OpenAI-specific and cleaner for modal runtime surfaces.
2. Technical detail remains in diagnostics logs/manual setup docs, not overloaded in UI.

## 4) Save-Draft and Baseline Safety

Confirmed by implementation scope:
1. Draft creation/save/reopen paths were not moved to OCR dependency.
2. OCR remains retryable helper action.
3. OCR failure does not remove/lose receipt draft.
4. Existing travel workspace/modal baseline from 30C/30D remains intact (no spoiler rollback, no shell changes).

## 5) OCR Provider/Fallback Model After 30K

Runtime model:
1. Receipt draft save path is always independent.
2. OCR parse path:
   - selects provider by `TRAVEL_RECEIPT_OCR_PROVIDER`
   - applies preprocessing normalization/hints
   - calls provider module
3. If provider is unavailable/misconfigured:
   - explicit unavailable error
   - user can keep draft and retry later.
4. OpenAI remains optional legacy provider, not architectural default.

## 6) Manual-Only Setup Required (Critical)

This pass does not deploy external OCR infrastructure automatically.
To enable free OCR contour, deploy PaddleOCR service manually.

## 6.1 Target architecture (manual layer)

1. Payment Control (Vercel) calls external OCR HTTP endpoint.
2. External OCR service runs PaddleOCR (self-hosted).
3. Service returns either structured prefill JSON or raw OCR text.
4. Payment Control maps response into receipt prefill suggestion.

## 6.2 Example minimal PaddleOCR service setup (step-by-step)

### Step A. Prepare server
1. Use any host where you can run Python services (VM, VPS, Docker host, Railway/Render/Fly/self VPS).
2. Install Docker (recommended) or Python 3.10+.

### Step B. Create OCR service folder
1. Create a new folder outside this repo, e.g. `paddleocr-service`.
2. Create files:
   - `app.py`
   - `requirements.txt`
   - optional `Dockerfile`.

### Step C. Put minimal API scaffold

`requirements.txt` (example):
```txt
fastapi
uvicorn
paddleocr
opencv-python-headless
numpy
```

`app.py` (skeleton contract expected by Payment Control):
```python
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI()

class OcrRequest(BaseModel):
    imageDataUrl: str
    tripCurrency: str
    preprocessing: dict | None = None

@app.get('/health')
def health():
    return {'ok': True}

@app.post('/ocr/receipt')
def ocr_receipt(payload: OcrRequest, authorization: str | None = Header(default=None), x_api_key: str | None = Header(default=None)):
    # TODO: validate auth token if you configured one
    # TODO: decode imageDataUrl, apply preprocessing, run PaddleOCR
    # Return either structured suggestion or raw text.
    return {
        'ok': True,
        'data': {
            'rawText': 'sample raw text from PaddleOCR',
            'sourceAmount': None,
            'sourceCurrency': payload.tripCurrency,
            'spentAt': None,
            'merchant': None,
            'description': None,
            'category': 'General',
            'conversionRate': None,
            'fieldQuality': {
                'sourceAmount': 'missing',
                'sourceCurrency': 'low',
                'spentAt': 'missing',
                'merchant': 'missing',
                'description': 'missing',
                'category': 'low',
                'conversionRate': 'missing'
            }
        }
    }
```

### Step D. Run service locally
1. `pip install -r requirements.txt`
2. `uvicorn app:app --host 0.0.0.0 --port 8080`
3. Verify:
   - `GET http://localhost:8080/health` -> `{ "ok": true }`
   - `POST http://localhost:8080/ocr/receipt` with test JSON -> `ok: true` payload.

### Step E. Deploy OCR service
1. Deploy this service to your chosen host.
2. Ensure HTTPS URL is publicly reachable from Vercel.
3. Save endpoint URL, e.g. `https://your-ocr.example.com/ocr/receipt`.

### Step F. Configure Payment Control in Vercel
1. Open Vercel project -> Settings -> Environment Variables.
2. Add:
   - `TRAVEL_RECEIPT_OCR_PROVIDER=paddle`
   - `TRAVEL_RECEIPT_OCR_PADDLE_ENDPOINT=https://your-ocr.example.com/ocr/receipt`
   - `TRAVEL_RECEIPT_OCR_PADDLE_API_KEY=<token_if_used>` (or empty)
   - `TRAVEL_RECEIPT_OCR_PADDLE_TIMEOUT_MS=15000`
   - `TRAVEL_RECEIPT_OCR_PREPROCESS_PROFILE=receipt_basic_v1`
3. Keep OpenAI env optional/empty unless you intentionally use legacy branch.
4. Redeploy project.

### Step G. End-to-end verification
1. Open Telegram Mini App -> Travel -> select trip -> Receipt drafts.
2. Save a new receipt draft (must work regardless of OCR).
3. Run OCR parse.
4. Expected:
   - no provider-unavailable error when endpoint configured correctly,
   - parsed suggestion appears (or clear provider failure category),
   - draft is preserved on OCR failure.

## 7) OCR Service Contract (for manual backend implementer)

Recommended response contract from Paddle service:
1. Success (structured):
```json
{
  "ok": true,
  "data": {
    "sourceAmount": 1234.5,
    "sourceCurrency": "EUR",
    "spentAt": "2026-04-06T12:00:00.000Z",
    "merchant": "Cafe",
    "description": "Lunch",
    "category": "Food",
    "conversionRate": null,
    "rawText": "...",
    "fieldQuality": {
      "sourceAmount": "high",
      "sourceCurrency": "high",
      "spentAt": "medium",
      "merchant": "medium",
      "description": "medium",
      "category": "medium",
      "conversionRate": "missing"
    }
  }
}
```
2. Success (raw text fallback):
```json
{
  "ok": true,
  "data": {
    "rawText": "full OCR text"
  }
}
```
3. Error:
```json
{
  "ok": false,
  "error": {
    "code": "unauthorized|rate_limit|quota|provider_error",
    "message": "human-readable reason"
  }
}
```

## 8) Files Changed

1. `.env.example`
2. `src/lib/config/server-env.ts`
3. `src/lib/i18n/localization.tsx`
4. `src/lib/travel/receipt-ocr.ts`
5. `src/lib/travel/ocr/types.ts` (new)
6. `src/lib/travel/ocr/preprocess.ts` (new)
7. `src/lib/travel/ocr/provider-utils.ts` (new)
8. `src/lib/travel/ocr/providers/paddle-provider.ts` (new)
9. `src/lib/travel/ocr/providers/openai-provider.ts` (new)
10. `docs/reports/internal_version_history.md`
11. `docs/reports/phase_30K_paddleocr_foundation_ocr_provider_refactor_and_receipt_prefill_reliability.md`

## 9) What Was Intentionally NOT Changed

1. No DB/schema migrations.
2. No new feature-wave outside OCR architecture.
3. No shell/tab/navigation redesign.
4. No recurring/travel domain merge.
5. No premium/paywall logic changes.
6. No bot-facing manual Telegram settings changes.

## 10) Verification Run

Executed:
1. `npm run lint` (pass; existing non-blocking `next/no-img-element` warnings remain in travel image previews)
2. `npm run build` (pass)
3. Targeted tests:
   - `node --test --test-isolation=none src/lib/travel/currency.test.ts src/lib/travel/finalization.test.ts src/lib/travel/receipt-ocr.test.ts src/lib/travel/split.test.ts` (pass)

## 11) Manual Verification Checklist

1. Receipt draft save works when OCR provider is unavailable/misconfigured.
2. Parse action returns provider-aware error messages (not generic ambiguity).
3. With Paddle endpoint configured and healthy, parse action returns suggestion and updates draft status.
4. OCR retry path works after failure without losing draft.
5. Travel modals/workspace behavior from 30C/30D remains unchanged.
6. RU strings display correctly for new OCR failure/preprocessing states.

## 12) Risks / Regression Watchlist

1. External Paddle service contract mismatch can produce `MALFORMED_PROVIDER_RESPONSE` until backend response shape aligns.
2. Raw-text heuristic fallback is intentionally conservative; quality depends on backend OCR output quality.
3. If Paddle endpoint has strict auth but env token missing, parse will fail as provider auth error (expected operational state).
4. Long OCR service latency requires timeout tuning (`TRAVEL_RECEIPT_OCR_PADDLE_TIMEOUT_MS`) per hosting region.

## 13) Acceptance Self-Check

1. `ui-ux-pro-max` and `DESIGN.md` were used as quality constraints - done.
2. Receipt draft path remains independent from OCR - done.
3. OCR provider abstraction introduced - done.
4. PaddleOCR integration foundation added - done.
5. OpenAI is no longer the architectural default path - done.
6. Error mapping/diagnostics remain explicit and honest - done.
7. Manual setup instructions are detailed and executable - done.
