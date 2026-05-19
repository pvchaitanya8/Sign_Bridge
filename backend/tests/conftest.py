"""
conftest.py — shared pytest fixtures
"""
import sys, os

# Make sure backend/ is on the path so `import predictor` / `import main` works
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import numpy as np
import cv2
import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture(scope='session')
def client():
    """A synchronous FastAPI test client shared across the whole session."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def black_jpeg() -> bytes:
    """480×640 solid-black JPEG — MediaPipe will find no hand in this."""
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    _, buf = cv2.imencode('.jpg', frame)
    return buf.tobytes()


@pytest.fixture
def white_jpeg() -> bytes:
    """480×640 solid-white JPEG — also hand-free."""
    frame = np.full((480, 640, 3), 255, dtype=np.uint8)
    _, buf = cv2.imencode('.jpg', frame)
    return buf.tobytes()
