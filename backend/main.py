"""
main.py — SignBridge FastAPI Backend
=====================================
Exposes two endpoints:

  GET  /health   — liveness check (used by Render + frontend)
  WS   /ws       — real-time sign prediction over WebSocket

WebSocket message protocol
---------------------------
  Client -> Server:
      Raw JPEG bytes of the current webcam frame.
      The frontend grabs a frame from a <canvas>, encodes it as
      JPEG (quality 0.7), and sends the ArrayBuffer directly.

  Server -> Client:
      JSON text:
        {
          "hand_detected": true | false,
          "letter":        "A" | "space" | "del" | null,
          "confidence":    0.94 | null
        }

Why raw bytes instead of base64?
  Skipping base64 encoding/decoding saves ~33% bandwidth and
  removes a serialisation step on both sides. The browser's
  WebSocket API handles binary frames natively.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import predictor   # loads model at import time


# -- App lifecycle -------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # predictor.py already loaded the model at module import
    print("[main] SignBridge backend ready")
    yield
    print("[main] Shutting down")


app = FastAPI(title="SignBridge API", version="2.0.0", lifespan=lifespan)

# -- CORS ----------------------------------------------------------------------
# Allow the React dev server (and later the Vercel URL) to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:4173",   # Vite preview
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -- REST ----------------------------------------------------------------------
@app.get("/health")
async def health():
    """Quick liveness check -- frontend polls this on load."""
    return {
        "status":  "ok",
        "classes": list(predictor._label_encoder.classes_),
    }


# -- WebSocket -----------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Real-time sign prediction loop.

    Each message from the client is a JPEG frame as raw bytes.
    We run the full MediaPipe + Random Forest pipeline and send
    back a JSON prediction -- typically in < 30 ms.
    """
    await websocket.accept()
    client = websocket.client
    print(f"[ws] Client connected: {client}")

    try:
        while True:
            # Receive raw bytes from the browser
            frame_bytes = await websocket.receive_bytes()

            # Run the full inference pipeline
            result = predictor.predict_from_bytes(frame_bytes)

            # Send JSON prediction back
            await websocket.send_json(result)

    except WebSocketDisconnect:
        print(f"[ws] Client disconnected: {client}")
    except Exception as e:
        print(f"[ws] Error: {e}")
        await websocket.close()
