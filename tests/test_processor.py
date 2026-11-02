import pytest
from collections import deque
from src.processor import detect_anomaly

def test_detect_anomaly_not_enough_data():
    window = deque([10.0, 10.1], maxlen=50)
    is_anomaly, score = detect_anomaly(20.0, window, 3.0)
    assert not is_anomaly
    assert score == 0.0

def test_detect_anomaly_normal_value():
    # Provide 25 normal values
    window = deque([10.0 + (i * 0.1 % 0.5) for i in range(25)], maxlen=50)
    is_anomaly, score = detect_anomaly(10.2, window, 3.0)
    assert not is_anomaly

def test_detect_anomaly_spike():
    # Provide 30 normal values
    window = deque([10.0 for _ in range(30)], maxlen=50)
    is_anomaly, score = detect_anomaly(100.0, window, 3.0)
    assert is_anomaly
    assert score > 0
