# Issue 3: Implement Basic IoT Sensor Simulator

## Description
Create a Python script (`src/sensor_node.py`) that acts as an IoT edge device. It should connect to the MQTT broker and publish simulated telemetry data (e.g., temperature, humidity, vibration).

## Acceptance Criteria
- [x] Script connects to Mosquitto broker using `paho-mqtt`.
- [x] Script takes arguments for `device_id` and `sensor_type`.
- [x] Publishes JSON payload containing timestamp, device_id, and value to topic `sensors/{device_id}`.
- [x] Basic loop running every `N` seconds with normal standard values.
