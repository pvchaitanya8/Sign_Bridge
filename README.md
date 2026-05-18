# SignBridge

A real-time, two-way communication aid that bridges the gap between sign language and spoken language.

A deaf or mute person signs into their webcam → the app translates it into text and speaks it aloud. The hearing person speaks back → their words appear as text for the signer to read.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS v4 + Radix UI |
| Animations | Framer Motion |
| Backend | FastAPI (Python 3.11) |
| Hand Tracking | MediaPipe Hands |
| Classifier | scikit-learn Random Forest |
| Real-time | WebSocket |
| Speech | Web Speech API (TTS + STT) |
| Deployment | Render (backend) + Vercel (frontend) |

---

## Project Structure

```
SignBridge/
├── backend/
│   ├── dataset/          # ASL training images (not in git — see below)
│   │   ├── train/        # 87,000 images across 29 classes
│   │   └── test/         # 28 test images
│   ├── model/
│   │   ├── preprocess.py # Extract MediaPipe landmarks → landmarks.csv
│   │   ├── train.py      # Train Random Forest → asl_model.pkl
│   │   └── asl_model.pkl # Trained model (not in git)
│   ├── main.py           # FastAPI app + WebSocket endpoint
│   ├── requirements.txt
│   └── venv/             # Python virtual environment (not in git)
│
├── frontend/
│   ├── src/
│   │   ├── components/   # CameraPanel, TranscriptPanel, SentenceBuilder, SpeechInput
│   │   ├── hooks/        # useWebSocket, useSpeech
│   │   ├── types/        # Shared TypeScript interfaces
│   │   ├── lib/          # Utility functions (cn, etc.)
│   │   └── App.tsx
│   └── vite.config.ts
│
└── README.md
```

---

## Dataset

Uses the [ASL Alphabet dataset](https://www.kaggle.com/datasets/grassknoted/asl-alphabet) from Kaggle.

- **29 classes**: A–Z + `space` + `del` + `nothing`
- **87,000 training images** (3,000 per class)
- **28 test images** (1 per class)

The dataset is excluded from git due to size. Download it from Kaggle and place it at:

```
backend/dataset/train/<CLASS>/   ← training images
backend/dataset/test/            ← test images
```

---

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt

# One-time: generate landmark CSV and train the model
python model/preprocess.py
python model/train.py

# Run the API server
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## How It Works

1. **MediaPipe Hands** detects 21 hand landmarks (x, y, z) from each webcam frame — 63 numbers total.
2. A **Random Forest classifier** predicts which ASL letter those 63 numbers represent.
3. Predictions are streamed to the browser via **WebSocket** in real time.
4. Letters are accumulated into words in the **sentence builder** (hold a sign for ~1 second to confirm a letter).
5. The completed sentence is read aloud via the browser's **Text-to-Speech** API.
6. The hearing person speaks back via **Speech-to-Text**, and their words appear as text.

---

## ASL Classes

`A B C D E F G H I J K L M N O P Q R S T U V W X Y Z space del nothing`

> Note: J and Z involve motion (they're drawn in the air). The static-landmark model handles these with reduced accuracy — this is a known limitation of landmark-only approaches.

---

## Build Phases

- [x] Phase 1 — Project Setup
- [ ] Phase 2 — Model Training
- [ ] Phase 3 — Backend API
- [ ] Phase 4 — Frontend Core
- [ ] Phase 5 — Speech Features
- [ ] Phase 6 — UI Polish
- [ ] Phase 7 — Deployment
