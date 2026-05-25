"""
test_health.py — GET /health endpoint tests
"""
import pytest


def test_health_returns_200(client):
    resp = client.get('/health')
    assert resp.status_code == 200


def test_health_status_is_ok(client):
    data = client.get('/health').json()
    assert data['status'] == 'ok'


def test_health_has_classes_list(client):
    data = client.get('/health').json()
    assert 'classes' in data
    assert isinstance(data['classes'], list)


def test_health_classes_not_empty(client):
    data = client.get('/health').json()
    assert len(data['classes']) > 0


def test_health_classes_include_standard_asl_letters(client):
    classes = client.get('/health').json()['classes']
    lower = [c.lower() for c in classes]
    for letter in ['a', 'b', 'c', 'del', 'space']:
        assert letter in lower, f"Expected '{letter}' in classes, got: {lower}"


def test_health_classes_count(client):
    """Should have exactly 29 classes: a-z + del + space + nothing."""
    data = client.get('/health').json()
    assert len(data['classes']) == 29
