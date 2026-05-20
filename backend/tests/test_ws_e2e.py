"""
test_ws_e2e.py — end-to-end WebSocket inference test
====================================================
Runs against a live uvicorn instance on port 8001.
Sends each *_test.jpg from dataset/test/ and reports
predicted letter + confidence vs expected.
"""
import asyncio
import json
import os
import sys
import websockets

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_DIR = os.path.join(BASE, "dataset", "test")
WS_URL = "ws://localhost:8001/ws"


async def run():
    files = sorted(f for f in os.listdir(TEST_DIR) if f.endswith("_test.jpg"))
    print(f"Found {len(files)} test images at {TEST_DIR}")
    print(f"Connecting to {WS_URL} ...")

    results = []
    async with websockets.connect(WS_URL) as ws:
        for fname in files:
            expected = fname.replace("_test.jpg", "")
            path = os.path.join(TEST_DIR, fname)
            with open(path, "rb") as f:
                blob = f.read()
            await ws.send(blob)
            reply = await asyncio.wait_for(ws.recv(), timeout=5.0)
            d = json.loads(reply)
            # 'nothing' is correctly represented as hand_detected=false (no letter)
            if expected.lower() == "nothing":
                ok = d.get("hand_detected") is False
            else:
                ok = (d.get("letter") or "").lower() == expected.lower()
            results.append({
                "expected": expected,
                "got": d.get("letter"),
                "conf": d.get("confidence"),
                "hand": d.get("hand_detected"),
                "ok": ok,
            })
            mark = "OK  " if ok else "MISS"
            got_str = str(d.get("letter"))
            conf_str = f"{d.get('confidence'):.3f}" if d.get("confidence") is not None else "  -  "
            print(f"  [{mark}] {expected:<8} -> {got_str:<8} "
                  f"conf={conf_str}  hand={d.get('hand_detected')}")

    correct = sum(1 for r in results if r["ok"])
    print(f"\nResult: {correct}/{len(results)} correct "
          f"({correct/len(results)*100:.1f}%)")
    return 0 if correct == len(results) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
