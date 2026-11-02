# Issue 1: MQTT Alert Publisher

## Description
Instead of just storing the anomaly, the system should broadcast alerts in real-time so other services (like a UI) can react immediately.

## Acceptance Criteria
- [x] When an anomaly is detected in `processor.py`, publish a message to the `alerts/{device_id}` topic.
- [x] Payload should be a JSON object containing the anomaly details (value, time, score).
