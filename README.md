# Infrastructure Simulation

## Setup Instructions

### 1. Create a virtual environment

Run the following command to create a virtual environment:

```bash
python -m venv venv
```

### 2. Activate the virtual environment

**On Windows:**
```powershell
.\venv\Scripts\activate
```

**On macOS/Linux:**
```bash
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

## MQTT Broker

This project uses an Eclipse Mosquitto MQTT broker running via Docker.

### Start the broker

Run the following command to start the Mosquitto broker in the background:

```bash
docker-compose up -d
```

### Test the broker

You can test the broker using the Mosquitto CLI clients (`mosquitto_sub` and `mosquitto_pub`):

1. **Subscribe to a topic:**
   ```bash
   mosquitto_sub -h localhost -p 1883 -t "test/topic"
   ```

2. **Publish a message to the topic:**
   ```bash
   mosquitto_pub -h localhost -p 1883 -t "test/topic" -m "Hello MQTT!"
   ```
