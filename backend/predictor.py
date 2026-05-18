"""
predictor.py — Inference Engine
================================
Owns everything between "raw JPEG bytes arrive" and
"prediction dict goes back to the WebSocket client".

Responsibilities:
  1. Load asl_model.pkl once at startup (model + label encoder)
  2. Run MediaPipe Hands on each frame to extract landmarks
  3. Normalise landmarks identically to how preprocess.py did it
  4. Run the Random Forest classifier
  5. Return a structured prediction result

Kept separate from main.py so it's easy to swap the model later
(e.g. replace Random Forest with a neural net) without touching
the API layer.
"""

import os
import io
import numpy as np
import cv2
import joblib
import mediapipe as mp
from PIL import Image


# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "asl_model.pkl")

# ── MediaPipe ─────────────────────────────────────────────────────────────────
_mp_hands = mp.solutions.hands
_hands    = _mp_hands.Hands(
    # static_image_mode=True  → treats every frame independently.
    # No temporal smoothing means no cross-frame lag — each frame
    # gets an answer in one inference pass (~15-30 ms).
    # Trade-off: slightly more CPU per frame, but we're only processing
    # one frame at a time (back-pressure on the client), so this is fine.
    static_image_mode=True,
    max_num_hands=1,
    min_detection_confidence=0.5,  # slightly higher threshold reduces false positives
    min_tracking_confidence=0.5,
)

# ── Model (loaded once, shared across all WebSocket connections) ───────────────
_bundle        = joblib.load(MODEL_PATH)
_classifier    = _bundle["model"]
_label_encoder = _bundle["label_encoder"]

print(f"[predictor] Model loaded — {len(_label_encoder.classes_)} classes: "
      f"{list(_label_encoder.classes_)}")


# ── Normalisation (must match preprocess.py exactly) ──────────────────────────
def _normalise(landmarks) -> list[float]:
    """
    Translate to wrist origin, scale to [-1, 1].
    Returns 63 floats: [x0,y0,z0, x1,y1,z1, ... x20,y20,z20]
    """
    pts = np.array([[lm.x, lm.y, lm.z] for lm in landmarks], dtype=np.float32)
    pts -= pts[0]                          # anchor to wrist
    max_val = np.abs(pts).max()
    if max_val > 0:
        pts /= max_val
    return pts.flatten().tolist()


# ── Public API ─────────────────────────────────────────────────────────────────
def predict_from_bytes(frame_bytes: bytes) -> dict:
    """
    Full pipeline: JPEG bytes → prediction dict.

    Returns:
        {
            "hand_detected": bool,
            "letter":        str | None,   # "A"–"Z", "space", "del", or None
            "confidence":    float | None, # 0.0–1.0
        }

    'nothing' (no hand in frame) is handled here — if MediaPipe
    detects no hand we return hand_detected=False without touching
    the classifier. This is more honest than trying to classify absence.
    """
    # Guard: cv2.imdecode raises cv2.error on empty buffer (not just returns None)
    if not frame_bytes:
        return {"hand_detected": False, "letter": None, "confidence": None}

    # Decode JPEG bytes → numpy BGR array
    img_array = np.frombuffer(frame_bytes, dtype=np.uint8)
    frame_bgr = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    if frame_bgr is None:
        return {"hand_detected": False, "letter": None, "confidence": None}

    # MediaPipe expects RGB
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    result    = _hands.process(frame_rgb)

    if not result.multi_hand_landmarks:
        return {"hand_detected": False, "letter": None, "confidence": None}

    # Extract + normalise landmarks
    features = _normalise(result.multi_hand_landmarks[0].landmark)
    X        = np.array(features).reshape(1, -1)   # shape (1, 63)

    # Classify — get probabilities for all classes
    probs        = _classifier.predict_proba(X)[0]
    top_idx      = int(np.argmax(probs))
    confidence   = float(probs[top_idx])
    letter       = _label_encoder.inverse_transform([top_idx])[0]

    return {
        "hand_detected": True,
        "letter":        letter,
        "confidence":    round(confidence, 4),
    }
