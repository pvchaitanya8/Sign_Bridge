<div align="center">

# SignBridge

**Real-time, two-way ASL ↔ Speech communication**

[![Python](https://img.shields.io/badge/Python-3.11-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-0.10-ff6f00?style=flat-square)](https://mediapipe.dev)
[![Tests](https://img.shields.io/badge/Tests-91%20passing-22c55e?style=flat-square)](./frontend/src)
[![License](https://img.shields.io/badge/License-MIT-6366f1?style=flat-square)](./LICENSE)

A deaf or hard-of-hearing person **signs into their webcam** → the app translates it into spoken words.
A hearing person **speaks back** → their words appear as text for the signer to read.

</div>

---

## How It Works

```
Signer                         SignBridge                      Listener
  │                               │                               │
  │── ASL gesture ──────────────►│                               │
  │                    MediaPipe extracts                         │
  │                    21 hand landmarks (63 floats)              │
  │                    Random Forest predicts letter              │
  │                    WebSocket streams result back              │
  │◄────────── Letter overlay + hold-ring progress ──────────────│
  │  (hold the sign 1.5 s → letter confirmed → sentence builds)  │
  │── "Speak & Send" ──────────►│──── Text-to-Speech ──────────►│
  │                               │                               │
  │◄───────── Text transcript ────│◄────── Speech-to-Text ───────│
```

---

## Features

| Feature | Detail |
|---|---|
| **Real-time sign detection** | 21-landmark MediaPipe pipeline, one inference per WebSocket round-trip |
| **Hold-to-confirm** | Hold any ASL sign for 1.5 s to commit the letter — prevents accidental input |
| **Two-way communication** | Signer → TTS speaks it aloud · Listener → STT transcribes back to text |
| **Dual theme** | Neumorphic dark + light themes, persisted across sessions |
| **91 automated tests** | 59 frontend (Vitest) + 32 backend (pytest) |
| **Zero-queue latency** | Back-pressure: only one frame in-flight at a time — no buffer buildup |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + Vite + TypeScript | UI and camera capture |
| **Styling** | Tailwind CSS v4 + custom neumorphic system | Dark/light neumorphism theme |
| **Animations** | Framer Motion | Transitions, ripple rings, entrance choreography |
| **Backend** | FastAPI + Uvicorn | WebSocket endpoint, inference API |
| **Hand Tracking** | MediaPipe Hands | 21-landmark extraction (63 floats per frame) |
| **Classifier** | scikit-learn Random Forest | Letter prediction from landmarks |
| **Real-time** | WebSocket binary frames | JPEG bytes → JSON prediction |
| **Speech** | Web Speech API | TTS (`speechSynthesis`) + STT (`SpeechRecognition`) |

---

## Project Structure

```
Sign-Language-Translator/
│
├── backend/
│   ├── model/
│   │   ├── preprocess.py       ← Runs MediaPipe on dataset → landmarks.csv
│   │   ├── train.py            ← Trains Random Forest → asl_model.pkl
│   │   └── asl_model.pkl       ← Trained model (not in git — you generate it)
│   │
│   ├── tests/
│   │   ├── conftest.py         ← Shared fixtures (TestClient, JPEG frames)
│   │   ├── test_predictor.py   ← 14 tests — _normalise(), predict_from_bytes()
│   │   └── test_websocket.py   ←  8 tests — WebSocket lifecycle + protocol
│   │
│   ├── main.py                 ← FastAPI app: GET /health · WS /ws
│   ├── predictor.py            ← MediaPipe + RF inference engine
│   ├── requirements.txt        ← Runtime dependencies
│   ├── requirements-dev.txt    ← + pytest, httpx for testing
│   └── pytest.ini
│
├── frontend/
│   ├── public/
│   │   └── favicon.svg         ← Hand-icon SVG favicon
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── CameraPanel.tsx         ← Webcam feed + glassmorphic prediction overlay
│   │   │   ├── SentenceBuilder.tsx     ← Hold-to-confirm ring + letter trough
│   │   │   ├── TranscriptPanel.tsx     ← Chat-style message feed (signer + listener)
│   │   │   ├── SpeechInput.tsx         ← Mic toggle with animated ripple rings
│   │   │   └── __tests__/              ← 26 component tests
│   │   │
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts         ← WS connection + back-pressure sendFrame
│   │   │   ├── useSpeech.ts            ← useTTS + useSTT (Web Speech API)
│   │   │   ├── useCamera.ts            ← getUserMedia + JPEG capture loop
│   │   │   └── __tests__/             ← 31 hook tests
│   │   │
│   │   ├── types/index.ts              ← Prediction, Message, ConnectionStatus
│   │   ├── lib/utils.ts                ← cn() utility (clsx + tailwind-merge)
│   │   ├── index.css                   ← Neumorphic design system (dark + light)
│   │   ├── App.tsx                     ← Root layout + theme toggle
│   │   └── test/setup.ts               ← Vitest global setup
│   │
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
└── README.md
```

---

## Installation

### Prerequisites

| Requirement | Version | How to check |
|---|---|---|
| Python | 3.10 – 3.12 | `python --version` |
| Node.js | 18 + | `node --version` |
| npm | 9 + | `npm --version` |
| Webcam | Any | — |
| Chrome or Edge | Latest | For Speech-to-Text support |

---

### 1 · Clone the repository

```bash
git clone https://github.com/pvchaitanya8/Sign-Language-Translator.git
cd Sign-Language-Translator
```

---

### 2 · Backend setup

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate          # Windows PowerShell / CMD
source venv/bin/activate       # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

---

### 3 · Download the dataset and train the model

> Skip this step if you already have `backend/model/asl_model.pkl`.

**Download the dataset**

1. Visit [Kaggle — ASL Alphabet](https://www.kaggle.com/datasets/grassknoted/asl-alphabet)
2. Download and extract the archive
3. Arrange the files so the folder structure looks like this:

```
backend/dataset/
├── train/
│   ├── A/        ← 3,000 images per class
│   ├── B/
│   ├── C/
│   ├── ...
│   └── Z/
└── test/
    ├── A_test.jpg
    ├── B_test.jpg
    └── ...       ← 1 test image per class
```

**Run preprocessing + training**

```bash
# Make sure you are inside backend/ with the venv active

# Step 1 — MediaPipe extracts landmarks from every training image
#           Produces: model/landmarks.csv  (takes ~2-5 minutes)
python model/preprocess.py

# Step 2 — Random Forest is trained on the landmark CSV
#           Produces: model/asl_model.pkl  (takes ~30 seconds)
python model/train.py
```

You should see output like:

```
[preprocess] Processing class A ... 3000 samples
[preprocess] Processing class B ... 3000 samples
...
[preprocess] Saved 87000 rows to model/landmarks.csv

[train] Training RandomForestClassifier(n_estimators=200) ...
[train] Test accuracy : 99.2 %
[train] Saved → model/asl_model.pkl
[train] Classes (29): ['A', 'B', ... 'Z', 'del', 'nothing', 'space']
```

---

### 4 · Start the backend server

```bash
# Inside backend/ with venv active
uvicorn main:app --reload --port 8000
```

Expected output:

```
INFO:     Uvicorn running on http://0.0.0.0:8000
[predictor] Model loaded — 29 classes: ['A', 'B', ..., 'space', 'del']
INFO:     Application startup complete.
```

Verify it works: open [http://localhost:8000/health](http://localhost:8000/health) — should return `{"status":"ok"}`.

---

### 5 · Start the frontend

Open a **new terminal** (keep the backend running):

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in **Chrome** or **Edge**.

---

## Usage Guide

### First launch

When the page loads:

- The **status chip** (top of the camera panel) transitions: `OFFLINE` → `CONNECTING` → **LIVE** (green)
- Click **Start Camera** and allow browser camera permission
- Your webcam feed appears in the left panel, mirrored like a selfie camera

---

### Signing a message (Signer → Listener)

1. **Show your hand** to the camera
2. A prediction overlay slides up at the bottom of the feed — it shows the detected letter and confidence percentage
3. The **ring disc** in the Sentence Builder section starts filling clockwise as you hold the sign
4. **Hold for 1.5 seconds** → the letter is confirmed with a spring-bounce animation and appended to your sentence
5. Repeat to build a full sentence

**Special signs:**

| Sign | Action |
|---|---|
| `SPACE` | Adds a space between words |
| `DEL` | Removes the last character (ring turns red) |

6. When your sentence is ready, click **Speak & Send** (green button):
   - The sentence is spoken aloud by the browser's text-to-speech engine
   - It appears in the conversation feed as a green-accented signer message

---

### Replying by voice (Listener → Signer)

1. Click the **mic button** at the bottom-right — two animated ripple rings pulse outward
2. Speak naturally — interim text appears as you talk
3. Click the mic button again to stop
4. Your speech is transcribed and appears as a blue-accented listener message in the feed

> Speech recognition requires **Chrome or Edge** — Firefox and Safari do not support the Web Speech API.

---

### Interface reference

| Control | Where | What it does |
|---|---|---|
| **Start / Stop Camera** | Left panel, bottom | Toggle webcam capture |
| **Hold ring disc** | Sentence Builder | Fills as you hold — confirms letter at 100% |
| **🗑 Clear** | Sentence Builder | Erase the current sentence |
| **📋 Copy** | Sentence Builder | Copy sentence to clipboard |
| **Speak & Send** | Sentence Builder | Speak aloud + add to conversation |
| **🔊 (on hover)** | Any message bubble | Re-read that message aloud |
| **☀ / 🌙** | Top-right nav | Toggle dark / light theme (persisted) |

---

## ASL Classes

The model recognises **29 classes**:

```
A  B  C  D  E  F  G  H  I  J  K  L  M
N  O  P  Q  R  S  T  U  V  W  X  Y  Z
space   del   nothing
```

> **J** and **Z** involve motion (drawn in the air). The static-landmark model handles these with reduced accuracy — this is a known limitation of single-frame landmark classification.

---

## Running Tests

### Backend (pytest)

```bash
cd backend

# Install dev dependencies (pytest + httpx)
pip install -r requirements-dev.txt

# Run all tests
pytest -v
```

Expected: **32 tests, all passing**

```
tests/test_predictor.py::test_model_bundle_has_required_keys  PASSED
tests/test_predictor.py::test_normalise_anchor_at_wrist       PASSED
tests/test_predictor.py::test_predict_from_bytes_empty_buffer PASSED
...
tests/test_websocket.py::test_ws_connects                     PASSED
tests/test_websocket.py::test_ws_prediction_with_hand         PASSED
...
========================= 32 passed in 4.31s =========================
```

### Frontend (Vitest)

```bash
cd frontend

npm run test:run          # single run, all tests
npm run test              # watch mode
npm run test:coverage     # with v8 coverage report
```

Expected: **59 tests, all passing**

```
✓ useWebSocket — connection lifecycle      6 tests
✓ useWebSocket — prediction parsing        2 tests
✓ useWebSocket — sendFrame                 2 tests
✓ useTTS                                   8 tests
✓ useSTT                                  13 tests
✓ SentenceBuilder — initial render         4 tests
✓ SentenceBuilder — hold-to-confirm        6 tests
✓ SentenceBuilder — action buttons         2 tests
✓ TranscriptPanel — empty state            2 tests
✓ TranscriptPanel — message rendering      6 tests
✓ TranscriptPanel — speak button           1 test
✓ SpeechInput — supported browser          4 tests
✓ SpeechInput — unsupported browser        3 tests

Test Files  5 passed
Tests      59 passed
```

---

## API Reference

### `GET /health`

Simple liveness check.

**Response:**
```json
{ "status": "ok" }
```

---

### `WS /ws`

Binary WebSocket endpoint for real-time sign prediction.

**Client → Server**

Raw JPEG bytes of the current webcam frame (binary WebSocket frame, no base64).

**Server → Client**

JSON text on every received frame:

```jsonc
// Hand detected
{
  "hand_detected": true,
  "letter":        "A",      // "A"–"Z" | "space" | "del" | "nothing"
  "confidence":    0.94      // 0.0 – 1.0
}

// No hand in frame
{
  "hand_detected": false,
  "letter":        null,
  "confidence":    null
}
```

---

## Configuration

### Use a remote backend (production)

Create `frontend/.env.local`:

```env
VITE_WS_URL=wss://your-app.onrender.com/ws
```

### Adjust hold duration

`frontend/src/components/SentenceBuilder.tsx`:

```typescript
const HOLD_MS = 1500          // ms to hold a sign before confirming
const MIN_CONFIDENCE = 0.45   // signs below this confidence are ignored
```

### Adjust capture rate and quality

`frontend/src/hooks/useCamera.ts`:

```typescript
const CAPTURE_FPS  = 15    // polling rate (back-pressure limits actual throughput)
const JPEG_QUALITY = 0.65  // 0.0–1.0  (lower = smaller payload, faster)
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Status chip stays **CONNECTING** | Backend not running | Run `uvicorn main:app --port 8000` |
| Status chip shows **ERROR** | Wrong WebSocket URL | Check `VITE_WS_URL` in `.env.local` |
| **Camera unavailable** error | Permission denied | Allow camera in browser settings → refresh |
| No prediction overlay appears | Hand out of frame | Centre your hand, improve lighting |
| Confidence stuck below 40% | Background clutter | Use a plain background, move hand closer |
| Mic button does not work | Non-Chrome browser | Switch to Chrome or Edge |
| `FileNotFoundError: asl_model.pkl` | Model not trained | Run `preprocess.py` then `train.py` |
| Very high latency | Old code without back-pressure | Pull latest, restart backend + frontend |

---

## Known Limitations

- **J and Z** — motion-based letters; single-frame landmarks cannot capture the trajectory
- **Single hand only** — the model processes the first detected hand; two-hand signs are not supported
- **Lighting sensitivity** — very dark or overexposed frames reduce MediaPipe detection confidence
- **Speech-to-Text browser support** — Chrome and Edge only (Web Speech API)
- **No user accounts** — conversation history is session-only; refreshing clears it

---

## Build Roadmap

- [x] Phase 1 — Project scaffold and tooling
- [x] Phase 2 — Dataset pipeline, landmark extraction, Random Forest training (99.2% accuracy)
- [x] Phase 3 — FastAPI backend with binary WebSocket inference endpoint
- [x] Phase 4 — React frontend: camera, WebSocket hook, core components
- [x] Phase 5 — Two-way speech: TTS + STT with continuous mode fix
- [x] Phase 6 — Neumorphic UI, dark/light themes, Framer Motion animations
- [x] Phase 6.5 — 91 automated tests, performance tuning, latency fixes
- [ ] Phase 7 — Deployment: Docker, Render (backend), Vercel (frontend)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes with tests
4. Verify: `pytest -v` and `npm run test:run` must both pass
5. Open a pull request against `dev`

---

## License

Apache-2.0 license — see [LICENSE](./LICENSE).

---

<div align="center">
Built to make communication more accessible.
</div>
