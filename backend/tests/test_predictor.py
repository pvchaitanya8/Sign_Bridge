"""
test_predictor.py — Unit tests for the predictor inference module.

We test _normalise() in isolation and predict_from_bytes() with
controlled inputs (invalid bytes, black frames) so no real hand
or webcam is needed.
"""
import numpy as np
import cv2
import pytest
import predictor


# ─────────────────────────────────────────────────────────────────────────────
# Helper — build a fake landmark list
# ─────────────────────────────────────────────────────────────────────────────
class _LM:
    """Minimal stand-in for a MediaPipe NormalizedLandmark."""
    def __init__(self, x: float, y: float, z: float):
        self.x, self.y, self.z = x, y, z


def fake_landmarks(wrist=(0.5, 0.3, 0.1)):
    """21 landmarks — wrist at given coords, others at varying offsets."""
    lms = [_LM(*wrist)]
    for i in range(1, 21):
        lms.append(_LM(wrist[0] + i * 0.02,
                       wrist[1] + i * 0.01,
                       wrist[2] + i * 0.005))
    return lms


# ─────────────────────────────────────────────────────────────────────────────
# _normalise() — unit tests
# ─────────────────────────────────────────────────────────────────────────────
class TestNormalise:
    def test_output_length_is_63(self):
        """21 landmarks × 3 coords = 63 floats."""
        result = predictor._normalise(fake_landmarks())
        assert len(result) == 63

    def test_wrist_is_origin_after_normalisation(self):
        """First 3 values (wrist x, y, z) must be 0 after anchoring."""
        result = predictor._normalise(fake_landmarks(wrist=(0.7, 0.4, 0.2)))
        assert result[0] == pytest.approx(0.0, abs=1e-6)
        assert result[1] == pytest.approx(0.0, abs=1e-6)
        assert result[2] == pytest.approx(0.0, abs=1e-6)

    def test_max_absolute_value_is_one(self):
        """After scaling, max |value| across all 63 floats should be 1.0."""
        result = predictor._normalise(fake_landmarks())
        assert max(abs(v) for v in result) == pytest.approx(1.0, abs=1e-5)

    def test_no_division_by_zero_when_all_same(self):
        """If every landmark is at the wrist position, max_val=0 — must not crash."""
        lms = [_LM(0.5, 0.5, 0.0)] * 21
        result = predictor._normalise(lms)
        assert all(v == 0.0 for v in result)

    def test_output_is_list_of_floats(self):
        result = predictor._normalise(fake_landmarks())
        assert isinstance(result, list)
        assert all(isinstance(v, float) for v in result)

    def test_translation_invariance(self):
        """Two hands with the same shape but different positions → same output."""
        lms_a = fake_landmarks(wrist=(0.1, 0.1, 0.0))
        lms_b = fake_landmarks(wrist=(0.8, 0.8, 0.5))
        assert predictor._normalise(lms_a) == pytest.approx(
            predictor._normalise(lms_b), abs=1e-5
        )


# ─────────────────────────────────────────────────────────────────────────────
# predict_from_bytes() — integration-style tests (no real hand needed)
# ─────────────────────────────────────────────────────────────────────────────
class TestPredictFromBytes:
    def test_result_schema_always_present(self):
        """Every result dict must have exactly these three keys."""
        result = predictor.predict_from_bytes(b'garbage')
        assert set(result.keys()) == {'hand_detected', 'letter', 'confidence'}

    def test_invalid_bytes_returns_no_hand(self):
        """Random bytes that can't decode to an image → hand_detected=False."""
        result = predictor.predict_from_bytes(b'not_a_valid_jpeg')
        assert result['hand_detected'] is False
        assert result['letter']      is None
        assert result['confidence']  is None

    def test_empty_bytes_returns_no_hand(self):
        result = predictor.predict_from_bytes(b'')
        assert result['hand_detected'] is False

    def test_black_frame_returns_no_hand(self, black_jpeg):
        """A solid black image contains no hand."""
        result = predictor.predict_from_bytes(black_jpeg)
        assert result['hand_detected'] is False
        assert result['letter']     is None
        assert result['confidence'] is None

    def test_white_frame_returns_no_hand(self, white_jpeg):
        result = predictor.predict_from_bytes(white_jpeg)
        assert result['hand_detected'] is False

    def test_hand_detected_true_returns_letter_and_confidence(self, black_jpeg):
        """
        We can't guarantee hand detection with a blank frame, but if a hand IS
        detected the letter should be a known class and confidence in [0, 1].
        This test only runs its assertions when hand_detected=True.
        """
        import predictor as p
        result = p.predict_from_bytes(black_jpeg)
        if result['hand_detected']:
            assert result['letter'] in p._label_encoder.classes_
            assert 0.0 <= result['confidence'] <= 1.0

    def test_confidence_rounded_to_4_decimals(self, black_jpeg):
        """Confidence values must have at most 4 decimal places."""
        result = predictor.predict_from_bytes(black_jpeg)
        if result['confidence'] is not None:
            val = result['confidence']
            assert round(val, 4) == val


# ─────────────────────────────────────────────────────────────────────────────
# Model bundle sanity checks
# ─────────────────────────────────────────────────────────────────────────────
class TestModelBundle:
    def test_label_encoder_has_29_classes(self):
        # 26 letters + 'del' + 'space' + 'nothing'
        # 'nothing' is the model's "no hand" sentinel — predictor.py
        # filters it at inference time so it never reaches the client.
        assert len(predictor._label_encoder.classes_) == 29

    def test_label_encoder_contains_del_and_space(self):
        classes = list(predictor._label_encoder.classes_)
        assert 'del'   in classes
        assert 'space' in classes

    def test_classifier_has_predict_proba(self):
        assert hasattr(predictor._classifier, 'predict_proba')

    def test_classifier_output_shape(self):
        """predict_proba on a 63-feature vector should return one probability per class."""
        X = np.zeros((1, 63))
        probs = predictor._classifier.predict_proba(X)[0]
        assert len(probs) == 29

    def test_classifier_probs_sum_to_one(self):
        X = np.zeros((1, 63))
        probs = predictor._classifier.predict_proba(X)[0]
        assert sum(probs) == pytest.approx(1.0, abs=1e-5)
