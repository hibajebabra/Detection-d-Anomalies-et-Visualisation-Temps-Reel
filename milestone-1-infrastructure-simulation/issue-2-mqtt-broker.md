# Issue 2: Set up MQTT Mosquitto Broker

## Description
Provide a way to run Eclipse Mosquitto locally as our message broker. Since this is a PoC, using Docker is the simplest approach.

## Acceptance Criteria
- [x] `docker-compose.yml` file created to spin up `eclipse-mosquitto`.
- [x] Provide basic `mosquitto.conf` configuration file to allow anonymous access (for easy local development) and enable WebSockets on port 9001.
- [x] Document how to start and test the broker using Mosquitto CLI clients.
