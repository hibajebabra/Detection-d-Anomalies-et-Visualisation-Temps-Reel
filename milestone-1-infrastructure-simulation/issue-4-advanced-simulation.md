# Issue 4: Advanced Simulator - Intermittent Connectivity & Noise

## Description
Enhance the `sensor_node.py` to better reflect real-world IoT conditions. This includes simulating network unreliability and generating more realistic (noisy/trending) data.

## Acceptance Criteria
- [x] Add logic to randomly drop connection to simulate intermittent connectivity.
- [x] Add auto-reconnect logic.
- [x] Introduce mathematical noise (e.g., sine wave with random jitter) for continuous values like vibration or temperature.
- [x] Add ability to forcefully trigger an "anomaly" spike via CLI argument or after a certain time to help test detection later.
