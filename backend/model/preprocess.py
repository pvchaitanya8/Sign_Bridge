"""
preprocess.py — Phase 2: Dataset Preprocessing
================================================
Reads every image from dataset/train/, runs it through MediaPipe Hands
to extract 21 hand landmarks (x, y, z) = 63 features per image,
normalises them so the model is position/scale invariant,
and saves everything to model/landmarks.csv.

Why landmarks instead of raw pixels?
  - A 300×300 image = 270,000 input features (slow, fragile)
  - 21 landmarks × 3 coords = 63 features (fast, lighting-invariant)
  - MediaPipe already does the hard work of finding the hand

Run from the backend/ directory:
  python model/preprocess.py
"""

import os
import csv
import cv2
import mediapipe as mp
import numpy as np

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRAIN_DIR   = os.path.join(BASE_DIR, "dataset", "train")
OUTPUT_CSV  = os.path.join(BASE_DIR, "model", "landmarks.csv")

# ── MediaPipe setup ───────────────────────────────────────────────────────────
mp_hands = mp.solutions.hands
hands    = mp_hands.Hands(
    static_image_mode=True,   # treat each image independently (not video)
    max_num_hands=1,           # we only care about the signing hand
    min_detection_confidence=0.3,  # low threshold = detect more, miss fewer
)

# ── CSV header: 63 landmark values + label ────────────────────────────────────
# MediaPipe gives 21 landmarks, each with (x, y, z)
# x0,y0,z0, x1,y1,z1, ... x20,y20,z20, label
header = [f"{axis}{i}" for i in range(21) for axis in ("x", "y", "z")] + ["label"]


def normalise(landmarks):
    """
    Make the feature vector position- and scale-invariant.

    Step 1 — Translation: subtract the wrist (landmark 0) from every point
             so the hand is always "anchored" at the origin regardless of
             where it appears in the frame.

    Step 2 — Scale: divide by the largest absolute value so all coords
             sit in [-1, 1] regardless of how close the hand is to the camera.

    Returns a flat list of 63 floats.
    """
    # Convert to numpy array shape (21, 3)
    pts = np.array([[lm.x, lm.y, lm.z] for lm in landmarks], dtype=np.float32)

    # Step 1: anchor to wrist
    pts -= pts[0]

    # Step 2: scale to [-1, 1]
    max_val = np.abs(pts).max()
    if max_val > 0:
        pts /= max_val

    return pts.flatten().tolist()  # 63 floats


def process_dataset():
    classes   = sorted(os.listdir(TRAIN_DIR))
    total     = sum(len(os.listdir(os.path.join(TRAIN_DIR, c))) for c in classes)
    processed = 0
    skipped   = 0

    print(f"Classes found : {len(classes)}  ->  {classes}")
    print(f"Total images  : {total}")
    print(f"Output CSV    : {OUTPUT_CSV}")
    print("-" * 60)

    os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)

    with open(OUTPUT_CSV, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)

        for cls in classes:
            cls_dir  = os.path.join(TRAIN_DIR, cls)
            images   = os.listdir(cls_dir)
            cls_ok   = 0
            cls_skip = 0

            for img_name in images:
                img_path = os.path.join(cls_dir, img_name)

                # Read image and convert BGR → RGB (MediaPipe expects RGB)
                img = cv2.imread(img_path)
                if img is None:
                    cls_skip += 1
                    continue

                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                result  = hands.process(img_rgb)

                if not result.multi_hand_landmarks:
                    # No hand detected — skip this image
                    cls_skip += 1
                    continue

                # Take the first (and only) detected hand
                features = normalise(result.multi_hand_landmarks[0].landmark)
                writer.writerow(features + [cls])
                cls_ok += 1

            processed += cls_ok
            skipped   += cls_skip

            # Progress per class
            pct = (processed + skipped) / total * 100
            print(f"  [{pct:5.1f}%]  {cls:<10}  ok:{cls_ok}  skipped:{cls_skip}")

    print("-" * 60)
    print(f"Done!  Rows written : {processed}")
    print(f"       Skipped      : {skipped}  (no hand detected)")
    print(f"       CSV saved to : {OUTPUT_CSV}")


if __name__ == "__main__":
    process_dataset()
    hands.close()
