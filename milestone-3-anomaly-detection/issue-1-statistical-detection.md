# Issue 1: Implement Statistical Anomaly Detection

## Description
Add lightweight statistical anomaly detection to `processor.py`. We will use Z-Score (Standard Score) over the rolling window.

## Acceptance Criteria
- [x] Implement a function to calculate the mean and standard deviation of a deque.
- [x] For each new incoming value, calculate its Z-score based on the historical window.
- [x] If the Z-score exceeds a configured threshold (e.g., > 3.0), flag the value as an anomaly.
- [x] Ensure the algorithm doesn't error out when the window is still filling up (initial state).
