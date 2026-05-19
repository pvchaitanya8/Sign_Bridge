"""
test_websocket.py — WebSocket endpoint tests.

Uses FastAPI's built-in TestClient which supports WebSocket testing
via the `websocket_connect()` context manager.
"""
import numpy as np
import cv2
import pytest


class TestWebSocketConnection:
    def test_ws_accepts_connection(self, client):
        with client.websocket_connect('/ws') as ws:
            assert ws is not None

    def test_ws_responds_to_black_frame(self, client, black_jpeg):
        with client.websocket_connect('/ws') as ws:
            ws.send_bytes(black_jpeg)
            data = ws.receive_json()
            assert data is not None

    def test_ws_response_has_required_keys(self, client, black_jpeg):
        with client.websocket_connect('/ws') as ws:
            ws.send_bytes(black_jpeg)
            data = ws.receive_json()
            assert 'hand_detected' in data
            assert 'letter'        in data
            assert 'confidence'    in data

    def test_ws_no_hand_in_black_frame(self, client, black_jpeg):
        with client.websocket_connect('/ws') as ws:
            ws.send_bytes(black_jpeg)
            data = ws.receive_json()
            assert data['hand_detected'] is False
            assert data['letter']        is None
            assert data['confidence']    is None

    def test_ws_handles_multiple_frames(self, client, black_jpeg):
        """Send three frames — should get three independent JSON responses."""
        with client.websocket_connect('/ws') as ws:
            for _ in range(3):
                ws.send_bytes(black_jpeg)
                data = ws.receive_json()
                assert 'hand_detected' in data

    def test_ws_handles_invalid_bytes_gracefully(self, client):
        """Garbage bytes must not crash the server — should return no-hand."""
        with client.websocket_connect('/ws') as ws:
            ws.send_bytes(b'not_a_jpeg_frame')
            data = ws.receive_json()
            assert data['hand_detected'] is False

    def test_ws_white_frame_returns_no_hand(self, client, white_jpeg):
        with client.websocket_connect('/ws') as ws:
            ws.send_bytes(white_jpeg)
            data = ws.receive_json()
            assert data['hand_detected'] is False

    def test_ws_confidence_in_range_when_detected(self, client, black_jpeg):
        """If a hand is ever detected, confidence must be between 0 and 1."""
        with client.websocket_connect('/ws') as ws:
            ws.send_bytes(black_jpeg)
            data = ws.receive_json()
            if data['hand_detected']:
                assert 0.0 <= data['confidence'] <= 1.0
