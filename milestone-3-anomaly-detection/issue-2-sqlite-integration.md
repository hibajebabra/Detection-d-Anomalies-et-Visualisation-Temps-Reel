# Issue 2: Integrate SQLite Storage

## Description
Persist flagged anomalies to a local SQLite database so they can be queried or reviewed later.

## Acceptance Criteria
- [x] Create an SQLite setup script or function to initialize a `db.sqlite` file with an `anomalies` table.
- [x] The table should store: timestamp, device_id, sensor_value, z_score, threshold.
- [x] Update `processor.py` to insert a record into SQLite whenever an anomaly is flagged.
- [x] Ensure database connections are handled safely in the Python application.
