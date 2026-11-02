// ─── Configuration ────────────────────────────────────────────────────────────
const brokerURL = window.location.hostname || "localhost";
const port = 9001;
const clientId = "ui_dashboard_" + Math.random().toString(16).substr(2, 8);

// ─── Sensor Profile Registry ───────────────────────────────────────────────────
// Define per-sensor-type icon, unit, color palette
const SENSOR_PROFILES = {
    temperature: {
        icon: "🌡️",
        unit: "°C",
        color: "#f97316",
        gradient: ["rgba(249,115,22,0.5)", "rgba(249,115,22,0.0)"],
        label: "Temperature"
    },
    humidity: {
        icon: "💧",
        unit: "%",
        color: "#06b6d4",
        gradient: ["rgba(6,182,212,0.5)", "rgba(6,182,212,0.0)"],
        label: "Humidity"
    },
    vibration: {
        icon: "📳",
        unit: "g",
        color: "#a855f7",
        gradient: ["rgba(168,85,247,0.5)", "rgba(168,85,247,0.0)"],
        label: "Vibration"
    }
};

// Default profile for unknown sensor types
const DEFAULT_PROFILE = {
    icon: "📡",
    unit: "",
    color: "#3b82f6",
    gradient: ["rgba(59,130,246,0.5)", "rgba(59,130,246,0.0)"],
    label: "Sensor"
};

// ─── State ─────────────────────────────────────────────────────────────────────
const charts = {};        // device_id -> Chart instance
const deviceTypes = {};   // device_id -> sensor_type
const maxDataPoints = 60;

// ─── MQTT Client ───────────────────────────────────────────────────────────────
const client = new Paho.MQTT.Client(brokerURL, port, "/mqtt", clientId);
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

// ─── DOM Elements ──────────────────────────────────────────────────────────────
const statusEl = document.getElementById("connection-status");
const chartsGrid = document.getElementById("charts-grid");
const alertsContainer = document.getElementById("alerts-container");

// ─── Boot ──────────────────────────────────────────────────────────────────────
connect();
loadHistoricalAnomalies();

// ─── Connection Logic ──────────────────────────────────────────────────────────
function connect() {
    statusEl.innerHTML = '<div class="pulse-dot"></div> Connecting...';
    statusEl.className = 'status';
    client.connect({
        timeout: 5,
        onSuccess: onConnect,
        onFailure: onFailure,
        useSSL: false
    });
}

function onConnect() {
    console.log("✅ Connected to MQTT broker via WebSocket");
    statusEl.innerHTML = '<div class="pulse-dot"></div> Live';
    statusEl.className = 'status connected';
    client.subscribe("sensors/#");
    client.subscribe("alerts/#");
}

function onFailure(responseObject) {
    console.error("❌ Connection failed:", responseObject.errorMessage);
    statusEl.innerHTML = '<div class="pulse-dot" style="animation:none;background:#ef4444"></div> Reconnecting...';
    statusEl.className = 'status disconnected';
    setTimeout(connect, 5000);
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.warn("⚠️ Connection lost:", responseObject.errorMessage);
        statusEl.innerHTML = '<div class="pulse-dot" style="animation:none;background:#ef4444"></div> Disconnected';
        statusEl.className = 'status disconnected';
        setTimeout(connect, 5000);
    }
}

// ─── Message Handling ──────────────────────────────────────────────────────────
function onMessageArrived(message) {
    const topic = message.destinationName;
    let payload;
    try {
        payload = JSON.parse(message.payloadString);
    } catch (e) {
        console.error("Failed to parse JSON", e);
        return;
    }

    if (topic.startsWith("sensors/")) {
        handleSensorData(payload);
    } else if (topic.startsWith("alerts/")) {
        handleAlert(payload);
    }
}

// ─── Sensor Data ───────────────────────────────────────────────────────────────
function handleSensorData(data) {
    const { device_id, sensor_type, value, timestamp } = data;
    if (!charts[device_id]) {
        deviceTypes[device_id] = sensor_type;
        createChart(device_id, sensor_type);
    }
    updateChart(device_id, value, timestamp);
}

function getProfile(sensor_type) {
    return SENSOR_PROFILES[sensor_type] || DEFAULT_PROFILE;
}

function createChart(device_id, sensor_type) {
    const profile = getProfile(sensor_type);

    const card = document.createElement('div');
    card.className = 'chart-card';
    card.id = `card-${device_id}`;
    card.innerHTML = `
        <div class="chart-header">
            <div class="chart-title">
                <span class="sensor-icon">${profile.icon}</span>
                ${device_id}
                <span class="sensor-type-badge" style="background:${profile.color}22;color:${profile.color};border-color:${profile.color}44">
                    ${profile.label}
                </span>
            </div>
            <div class="current-value" id="val-${device_id}" style="color:${profile.color}">--</div>
        </div>
        <div class="chart-container">
            <canvas id="canvas-${device_id}"></canvas>
        </div>
    `;

    chartsGrid.appendChild(card);

    const ctx = document.getElementById(`canvas-${device_id}`).getContext('2d');
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Outfit', sans-serif";

    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, profile.gradient[0]);
    gradient.addColorStop(1, profile.gradient[1]);

    charts[device_id] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: profile.label,
                data: [],
                borderColor: profile.color,
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        callback: (v) => `${v}${profile.unit}`
                    }
                }
            },
            animation: { duration: 300 }
        }
    });
}

function updateChart(device_id, value, timestamp) {
    const chart = charts[device_id];
    const profile = getProfile(deviceTypes[device_id]);
    const data = chart.data;
    const timeLabel = new Date(timestamp).toLocaleTimeString();

    data.labels.push(timeLabel);
    data.datasets[0].data.push(value);

    if (data.labels.length > maxDataPoints) {
        data.labels.shift();
        data.datasets[0].data.shift();
    }
    chart.update();

    const valEl = document.getElementById(`val-${device_id}`);
    if (valEl) {
        valEl.innerText = (typeof value === 'number' ? value.toFixed(2) : value) + " " + profile.unit;
    }
}

// ─── Alert Handling ────────────────────────────────────────────────────────────
function handleAlert(data) {
    const { device_id, value, z_score, timestamp } = data;
    const profile = getProfile(deviceTypes[device_id]);
    const timeStr = new Date(timestamp).toLocaleTimeString();
    const formattedValue = (typeof value === 'number' ? value.toFixed(2) : value) + " " + (profile?.unit || "");

    const toast = document.createElement('div');
    toast.className = 'alert-toast';

    toast.innerHTML = `
        <div class="alert-header">
            <div class="alert-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                ANOMALY DETECTED
            </div>
            <div class="alert-time">${timeStr}</div>
        </div>
        <div class="alert-body">
            ${profile?.icon || "📡"} <strong>${device_id}</strong> → <strong>${formattedValue}</strong>
        </div>
        <div class="alert-details">
            <span class="alert-score">Score: ${typeof z_score === 'number' ? z_score.toFixed(2) : z_score}</span>
        </div>
    `;

    alertsContainer.prepend(toast);

    // Flash the chart card
    const card = document.getElementById(`card-${device_id}`);
    if (card) {
        card.style.borderColor = '#ef4444';
        card.style.boxShadow = '0 0 24px rgba(239,68,68,0.4)';
        setTimeout(() => {
            card.style.borderColor = '';
            card.style.boxShadow = '';
        }, 1500);
    }

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 10000);
}

// ─── Historical Anomalies ──────────────────────────────────────────────────────
async function loadHistoricalAnomalies() {
    const apiURL = `http://${window.location.hostname || "localhost"}:8000/anomalies?limit=10`;
    try {
        const response = await fetch(apiURL);
        if (!response.ok) return;
        const anomalies = await response.json();
        anomalies.reverse().forEach(addHistoricalAlert);
    } catch (e) {
        console.warn("Could not load historical anomalies (API not running).", e);
    }
}

function addHistoricalAlert(data) {
    const { device_id, value, z_score, timestamp } = data;
    const timeStr = new Date(timestamp).toLocaleTimeString();

    const toast = document.createElement('div');
    toast.className = 'alert-toast';
    toast.style.cssText = 'opacity:0.65;border-color:rgba(239,68,68,0.2);';

    toast.innerHTML = `
        <div class="alert-header">
            <div class="alert-title" style="color:var(--text-secondary);">
                HISTORICAL ANOMALY
            </div>
            <div class="alert-time">${timeStr}</div>
        </div>
        <div class="alert-body">
            <strong>${device_id}</strong> → <strong>${typeof value === 'number' ? value.toFixed(2) : value}</strong>
        </div>
        <div class="alert-details">
            <span class="alert-score">Score: ${typeof z_score?.toFixed === 'function' ? z_score.toFixed(2) : z_score}</span>
        </div>
    `;

    alertsContainer.prepend(toast);
}
