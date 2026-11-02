import psycopg2
import os
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2.extras

app = FastAPI(title="IoT Anomaly API")

# Add CORS middleware so the dashboard can fetch data
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "iotuser")
DB_PASS = os.getenv("DB_PASS", "iotpassword")
DB_NAME = os.getenv("DB_NAME", "iotdb")

def get_db_connection():
    try:
        conn = psycopg2.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, dbname=DB_NAME)
        return conn
    except psycopg2.Error as e:
        print(f"Database connection error: {e}")
        return None

@app.get("/anomalies")
def get_recent_anomalies(limit: int = 50):
    """Fetch the most recent anomalies."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        # Use RealDictCursor to return dictionary-like objects instead of tuples
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            "SELECT timestamp, device_id, sensor_value as value, z_score, threshold FROM anomalies ORDER BY timestamp DESC LIMIT %s", 
            (limit,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


# Add CORS middleware so the dashboard can fetch data
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "iotuser")
DB_PASS = os.getenv("DB_PASS", "iotpassword")
DB_NAME = os.getenv("DB_NAME", "iotdb")

def get_db_connection():
    try:
        conn = psycopg2.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, dbname=DB_NAME)
        return conn
    except psycopg2.Error as e:
        print(f"Database connection error: {e}")
        return None

@app.get("/anomalies")
def get_recent_anomalies(limit: int = 50):
    """Fetch the most recent anomalies."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    try:
        # Use RealDictCursor to return dictionary-like objects instead of tuples
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            "SELECT timestamp, device_id, sensor_value as value, z_score, threshold FROM anomalies ORDER BY timestamp DESC LIMIT %s", 
            (limit,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
