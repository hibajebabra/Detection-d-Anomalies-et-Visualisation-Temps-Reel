# Issue 1: Implement Core Processing Service (Subscriber)

## Description
Create the main backend service (`src/processor.py`) that will subscribe to the incoming IoT sensor streams.

## Acceptance Criteria
- [x] Script connects to Mosquitto broker using `paho-mqtt`.
- [x] Subscribes to the wildcard topic `sensors/#`.
- [x] Parses incoming JSON payloads.
- [x] Gracefully handles connection drops and reconnections.
