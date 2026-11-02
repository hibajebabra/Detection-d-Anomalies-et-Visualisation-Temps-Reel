# Issue 2: Real-time Dashboard UI

## Description
Create a lightweight frontend to visualize the live data and incoming alerts without a backend server, by connecting directly to the Mosquitto broker via WebSockets.

## Acceptance Criteria
- [x] Create `public/index.html` and `public/app.js`.
- [x] Include Paho MQTT JavaScript client and Chart.js via CDN.
- [x] Connect to the Mosquitto broker's WebSocket port (9001).
- [x] Subscribe to `sensors/#` to render real-time charts.
- [x] Subscribe to `alerts/#` to display real-time notifications/alerts on the screen.
