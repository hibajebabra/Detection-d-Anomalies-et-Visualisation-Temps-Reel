import argparse
import time
import json
import random
import math
from datetime import datetime
import paho.mqtt.client as mqtt

def get_simulated_value(sensor_type, t_elapsed, is_anomaly=False):
    """Generate realistic values with mathematical noise and optional anomaly."""
    
    # Base sine wave + jitter
    if sensor_type == "temperature":
        base = 22.0
        wave = 2.0 * math.sin(t_elapsed / 100.0)
        jitter = random.uniform(-0.5, 0.5)
        value = base + wave + jitter
        if is_anomaly:
            value += random.uniform(15.0, 20.0)  # Huge spike
            
    elif sensor_type == "humidity":
        base = 50.0
        wave = 10.0 * math.sin(t_elapsed / 200.0)
        jitter = random.uniform(-2.0, 2.0)
        value = base + wave + jitter
        if is_anomaly:
            value -= random.uniform(20.0, 30.0)  # Sudden drop
            
    elif sensor_type == "vibration":
        base = 0.3
        wave = 0.1 * math.sin(t_elapsed / 50.0)
        jitter = random.uniform(-0.05, 0.05)
        value = base + wave + jitter
        if is_anomaly:
            value += random.uniform(2.0, 5.0)  # Massive vibration spike
            
    else:
        base = 50.0
        wave = 25.0 * math.sin(t_elapsed / 100.0)
        jitter = random.uniform(-5.0, 5.0)
        value = base + wave + jitter
        if is_anomaly:
            value *= random.uniform(2.0, 3.0)

    return round(value, 3)

def on_connect(*args, **kwargs):
    print("Connected to MQTT broker.")

def on_disconnect(*args, **kwargs):
    print("Disconnected from MQTT broker.")

def main():
    parser = argparse.ArgumentParser(description="Advanced IoT Sensor Simulator")
    parser.add_argument("--device_id", required=True, help="Unique device identifier")
    parser.add_argument("--sensor_type", required=True, help="Type of sensor")
    parser.add_argument("--interval", type=int, default=5, help="Publish interval in seconds")
    parser.add_argument("--broker", default="localhost", help="MQTT broker address")
    parser.add_argument("--port", type=int, default=1883, help="MQTT broker port")
    parser.add_argument("--drop_rate", type=float, default=0.0, help="Probability (0.0-1.0) of randomly dropping connection")
    parser.add_argument("--anomaly_time", type=int, default=0, help="Seconds after which an anomaly starts occurring (0 to disable)")

    args = parser.parse_args()

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=args.device_id)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect

    print(f"Connecting to broker {args.broker}:{args.port}...")
    try:
        client.connect(args.broker, args.port, 60)
    except Exception as e:
        print(f"Initial connection failed: {e}")
        
    client.loop_start()

    topic = f"sensors/{args.device_id}"
    print(f"Starting simulation for {args.device_id} ({args.sensor_type}).")
    print(f"Publishing to {topic} every {args.interval}s...")

    start_time = time.time()
    is_connected = True

    try:
        while True:
            t_elapsed = time.time() - start_time
            
            # Simulate intermittent connectivity
            if is_connected and args.drop_rate > 0 and random.random() < args.drop_rate:
                print("Simulating network failure... Dropping connection.")
                client.disconnect()
                is_connected = False
                
                # Sleep a bit while disconnected to simulate downtime
                downtime = random.uniform(args.interval, args.interval * 3)
                time.sleep(downtime)
                
                print("Simulating network recovery... Reconnecting.")
                try:
                    client.reconnect()
                    is_connected = True
                except Exception as e:
                    print(f"Reconnect failed: {e}")
                
                continue # Skip this publish cycle

            # Determine if we should trigger anomaly
            is_anomaly = False
            if args.anomaly_time > 0 and t_elapsed >= args.anomaly_time:
                # 20% chance of anomaly per tick once we pass anomaly_time
                is_anomaly = random.random() < 0.20
            
            value = get_simulated_value(args.sensor_type, t_elapsed, is_anomaly)
            
            payload = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "device_id": args.device_id,
                "sensor_type": args.sensor_type,
                "value": value,
                "is_anomaly": is_anomaly  # Flag helpful for monitoring
            }
            
            json_payload = json.dumps(payload)
            if is_connected:
                # The underlying library buffers messages if temporarily disconnected during loop
                # but we explicitly disconnected above, so we handle it gracefully.
                try:
                    client.publish(topic, json_payload)
                    print(f"Published: {json_payload}")
                except Exception as e:
                    print(f"Failed to publish: {e}")
            
            time.sleep(args.interval)
            
    except KeyboardInterrupt:
        print("\nStopping simulation...")
    finally:
        client.loop_stop()
        if is_connected:
            client.disconnect()
        print("Simulation ended.")

if __name__ == "__main__":
    main()
