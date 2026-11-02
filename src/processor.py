import argparse
import json
import logging
import statistics
import psycopg2
import os
import time
from datetime import datetime
from collections import deque
import paho.mqtt.client as mqtt

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger("Processor")

# Default MQTT & DB settings
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
TOPIC = "sensors/#"
WINDOW_SIZE = 50  # Number of recent values to keep
Z_SCORE_THRESHOLD = 3.0

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "iotuser")
DB_PASS = os.getenv("DB_PASS", "iotpassword")
DB_NAME = os.getenv("DB_NAME", "iotdb")

# State management
device_windows = {}

def setup_database():
    """Initialize the Postgres database and create the anomalies table if it doesn't exist."""
    max_retries = 5
    for i in range(max_retries):
        try:
            conn = psycopg2.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, dbname=DB_NAME)
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS anomalies (
                    id SERIAL PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    device_id TEXT NOT NULL,
                    sensor_value REAL NOT NULL,
                    z_score REAL NOT NULL,
                    threshold REAL NOT NULL
                )
            ''')
            conn.commit()
            conn.close()
            logger.info("Database setup complete.")
            return
        except psycopg2.OperationalError as e:
            logger.warning(f"Database connection failed, retrying ({i+1}/{max_retries})...")
            time.sleep(2)
    logger.error("Could not connect to database after several retries.")

def save_anomaly(timestamp, device_id, sensor_value, z_score, threshold):
    """Save an anomaly record to the database."""
    try:
        conn = psycopg2.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, dbname=DB_NAME)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO anomalies (timestamp, device_id, sensor_value, z_score, threshold)
            VALUES (%s, %s, %s, %s, %s)
        ''', (timestamp, device_id, sensor_value, z_score, threshold))
        conn.commit()
        conn.close()
    except psycopg2.Error as e:
        logger.error(f"Database error when saving anomaly: {e}")

import numpy as np
from sklearn.ensemble import IsolationForest

def detect_anomaly(value, window, threshold):
    """Calculate anomaly using Isolation Forest."""
    if len(window) < 20:
        return False, 0.0
    
    try:
        # Contamination is the expected proportion of outliers
        # We can loosely map threshold to contamination (higher threshold = lower contamination)
        contamination = max(0.01, min(0.1, 1.0 / threshold))
        
        clf = IsolationForest(contamination=contamination, random_state=42)
        X = np.array(window).reshape(-1, 1)
        clf.fit(X)
        
        pred = clf.predict([[value]])
        is_anomaly = bool(pred[0] == -1)
        
        # score_samples returns negative values (lower = more anomalous)
        # We convert to a positive pseudo-Z-score for the UI
        score = clf.score_samples([[value]])[0]
        pseudo_z_score = abs(score) * 10
        
        return is_anomaly, float(pseudo_z_score)
    except Exception as e:
        logger.error(f"ML Detection Error: {e}")
        return False, 0.0

def on_connect(client, userdata, flags, reason_code, properties=None):
    if reason_code == 0:
        logger.info(f"Successfully connected to MQTT broker.")
        client.subscribe(TOPIC)
        logger.info(f"Subscribed to wildcard topic: {TOPIC}")
    else:
        logger.error(f"Failed to connect, reason code: {reason_code}")

def on_disconnect(client, userdata, disconnect_flags, reason_code, properties=None):
    logger.warning(f"Disconnected from MQTT broker with reason code: {reason_code}")

def on_message(client, userdata, msg):
    try:
        payload_str = msg.payload.decode('utf-8')
        payload_data = json.loads(payload_str)
        
        # Extract fields
        device_id = payload_data.get("device_id")
        value = payload_data.get("value")
        timestamp = payload_data.get("timestamp", datetime.utcnow().isoformat() + "Z")
        
        if device_id and value is not None:
            # Initialize deque for new devices
            if device_id not in device_windows:
                device_windows[device_id] = deque(maxlen=WINDOW_SIZE)
            
            window = device_windows[device_id]
            
            # Perform anomaly detection
            is_anomaly, z_score = detect_anomaly(value, window, Z_SCORE_THRESHOLD)
            
            if is_anomaly:
                logger.warning(f"ANOMALY DETECTED! {device_id} | Value: {value} | Z-Score: {z_score:.2f}")
                save_anomaly(timestamp, device_id, value, z_score, Z_SCORE_THRESHOLD)
                
                # Publish real-time alert
                alert_payload = {
                    "timestamp": timestamp,
                    "device_id": device_id,
                    "value": value,
                    "z_score": round(z_score, 2),
                    "threshold": Z_SCORE_THRESHOLD
                }
                client.publish(f"alerts/{device_id}", json.dumps(alert_payload))
                logger.info(f"Published alert to alerts/{device_id}")
            else:
                logger.info(f"Received from {device_id} | Value: {value} | Z-Score: {z_score:.2f} | Window: {len(window)}/{WINDOW_SIZE}")
            
            # Add the new value to the rolling window AFTER checking it
            window.append(value)
            
        else:
            logger.warning(f"Missing device_id or value in payload: {payload_data}")
            
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON payload on {msg.topic}: {e}")
    except Exception as e:
        logger.error(f"Error processing message on {msg.topic}: {e}")

def main():
    global WINDOW_SIZE, Z_SCORE_THRESHOLD, DB_HOST, DB_USER, DB_PASS, DB_NAME, MQTT_BROKER, MQTT_PORT

    parser = argparse.ArgumentParser(description="IoT Processing Engine - Subscriber")
    parser.add_argument("--broker", default=MQTT_BROKER, help="MQTT broker address")
    parser.add_argument("--port", type=int, default=MQTT_PORT, help="MQTT broker port")
    parser.add_argument("--window_size", type=int, default=WINDOW_SIZE, help="Size of rolling window")
    parser.add_argument("--threshold", type=float, default=Z_SCORE_THRESHOLD, help="Z-score anomaly threshold")
    parser.add_argument("--db_host", default=DB_HOST, help="PostgreSQL database host")
    
    args = parser.parse_args()

    # Update globals if provided via CLI
    WINDOW_SIZE = args.window_size
    Z_SCORE_THRESHOLD = args.threshold
    DB_HOST = args.db_host
    MQTT_BROKER = args.broker
    MQTT_PORT = args.port

    # Setup database
    logger.info(f"Setting up Postgres database at {DB_HOST}...")
    setup_database()

    # Using VERSION2 API for latest paho-mqtt compatibility
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="processing_engine_1")
    
    # Assign callbacks
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message

    logger.info(f"Connecting to broker {MQTT_BROKER}:{MQTT_PORT}...")
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
    except Exception as e:
        logger.error(f"Initial connection failed: {e}")
        logger.info("Will attempt to reconnect in the background...")

    # loop_forever() automatically handles reconnections
    try:
        logger.info("Starting processing engine loop...")
        client.loop_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down processing engine...")
    finally:
        client.disconnect()
        logger.info("Disconnected.")

if __name__ == "__main__":
    main()
