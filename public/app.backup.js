// Configuration
const brokerURL = window.location.hostname || "localhost";
const port = 9001; // WebSocket port
const clientId = "ui_dashboard_" + Math.random().toString(16).substr(2, 8);

// State
const charts = {}; // device_id -> Chart instance
const maxDataPoints = 50;

// Initialize MQTT Client
const client = new Paho.MQTT.Client(brokerURL, port, "/mqtt", clientId);

client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

const statusEl = document.getElementById("connection-status");
const chartsGrid = document.getElementById("charts-grid");
const alertsContainer = document.getElementById("alerts-container");

// Connect
connect();

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
    console.log("Connected to MQTT broker via WebSocket");
    statusEl.innerHTML = '<div class="pulse-dot"></div> Connected to Broker';
    statusEl.className = 'status';
    
    // Subscribe to topics
    client.subscribe("sensors/#");
    client.subscribe("alerts/#");
    console.log("Subscribed to sensors/# and alerts/#");
}

function onFailure(responseObject) {
    console.error("Connection failed: " + responseObject.errorMessage);
    statusEl.innerHTML = '<div class="pulse-dot" style="animation:none;background-color:var(--danger)"></div> Connection Failed';
    statusEl.className = 'status disconnected';
    setTimeout(connect, 5000);
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.error("Connection lost: " + responseObject.errorMessage);
        statusEl.innerHTML = '<div class="pulse-dot" style="animation:none;background-color:var(--danger)"></div> Disconnected';
        statusEl.className = 'status disconnected';
    }
}

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

function handleSensorData(data) {
    const { device_id, sensor_type, value, timestamp } = data;
    
    // Create chart if it doesn't exist
    if (!charts[device_id]) {
        createChart(device_id, sensor_type);
    }
    
    // Update chart
    updateChart(device_id, value, timestamp);
}

function createChart(device_id, sensor_type) {
    // Create DOM elements
    const card = document.createElement('div');
    card.className = 'chart-card';
    card.id = `card-${device_id}`;
    
    card.innerHTML = `
        <div class="chart-header">
            <div class="chart-title">
                ${device_id}
                <span class="sensor-type-badge">${sensor_type || 'Sensor'}</span>
            </div>
            <div class="current-value" id="val-${device_id}">--</div>
        </div>
        <div class="chart-container">
            <canvas id="canvas-${device_id}"></canvas>
        </div>
    `;
    
    chartsGrid.appendChild(card);
    
    // Initialize Chart.js
    const ctx = document.getElementById(`canvas-${device_id}`).getContext('2d');
    
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Outfit', sans-serif";
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
    
    charts[device_id] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Value',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.4 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    display: false // Hide X axis for cleaner look
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                }
            },
            animation: {
                duration: 0 // Disable animation for performance on streaming data
            }
        }
    });
}

function updateChart(device_id, value, timestamp) {
    const chart = charts[device_id];
    const data = chart.data;
    
    // Format time for label
    const date = new Date(timestamp);
    const timeLabel = date.toLocaleTimeString();
    
    // Add new data
    data.labels.push(timeLabel);
    data.datasets[0].data.push(value);
    
    // Remove oldest if over max
    if (data.labels.length > maxDataPoints) {
        data.labels.shift();
        data.datasets[0].data.shift();
    }
    
    chart.update();
    
    // Update current value text
    document.getElementById(`val-${device_id}`).innerText = typeof value === 'number' ? value.toFixed(2) : value;
}

function handleAlert(data) {
    const { device_id, value, z_score, timestamp } = data;
    
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString();
    
    const toast = document.createElement('div');
    toast.className = 'alert-toast';
    
    toast.innerHTML = `
        <div class="alert-header">
            <div class="alert-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                ANOMALY DETECTED
            </div>
            <div class="alert-time">${timeStr}</div>
        </div>
        <div class="alert-body">
            Device <strong>${device_id}</strong> reported abnormal value: <strong>${typeof value === 'number' ? value.toFixed(2) : value}</strong>
        </div>
        <div class="alert-details">
            <span class="alert-score">Z-Score: ${z_score}</span>
        </div>
    `;
    
    alertsContainer.prepend(toast);
    
    // Flash the corresponding chart card
    const card = document.getElementById(`card-${device_id}`);
    if (card) {
        card.style.borderColor = 'var(--danger)';
        card.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4)';
        
        setTimeout(() => {
            card.style.borderColor = 'var(--card-border)';
            card.style.boxShadow = '';
        }, 1000);
    }
    
    // Remove toast after 8 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400); // Wait for animation
    }, 8000);
}

// Fetch historical anomalies from API
async function loadHistoricalAnomalies() {
    const apiURL = `http://${window.location.hostname || "localhost"}:8000/anomalies?limit=5`;
    try {
        const response = await fetch(apiURL);
        if (response.ok) {
            const anomalies = await response.json();
            // Since they are ordered DESC, we reverse them to process oldest first
            anomalies.reverse().forEach(anomaly => {
                addHistoricalAlert(anomaly);
            });
        }
    } catch (e) {
        console.warn("Could not load historical anomalies (API might not be running).", e);
    }
}

function addHistoricalAlert(data) {
    const { device_id, value, z_score, timestamp } = data;
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString();
    
    const toast = document.createElement('div');
    toast.className = 'alert-toast';
    toast.style.opacity = '0.8'; 
    toast.style.borderColor = 'rgba(239, 68, 68, 0.2)';
    
    toast.innerHTML = `
        <div class="alert-header">
            <div class="alert-title" style="color: var(--text-secondary);">
                HISTORICAL ANOMALY
            </div>
            <div class="alert-time">${timeStr}</div>
        </div>
        <div class="alert-body" style="font-size: 0.95rem;">
            Device <strong>${device_id}</strong> reported abnormal value: <strong>${typeof value === 'number' ? value.toFixed(2) : value}</strong>
        </div>
        <div class="alert-details">
            <span class="alert-score">Z-Score: ${z_score.toFixed ? z_score.toFixed(2) : z_score}</span>
        </div>
    `;
    
    // Disable the animation for historical toasts
    toast.style.animation = 'none';
    
    alertsContainer.prepend(toast);
}

// Call it on startup
loadHistoricalAnomalies();
