# Issue 2: Implement Streaming Window Mechanism

## Description
To perform anomaly detection on a stream, we need to maintain a state of recent values. Implement a rolling window for each `device_id`.

## Acceptance Criteria
- [x] Use `collections.deque` with a fixed `maxlen` to store the last N readings for each device.
- [x] Create a memory-efficient dictionary structure mapping `device_id` to its respective `deque` of recent values.
- [x] Update the deque as new messages arrive in the `processor.py` subscriber callback.
