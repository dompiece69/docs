const API_URL = 'http://localhost:3000/api';
let ws = null;
let currentBatchId = null;
let envChart = null;

// Initialize WebSocket connection
function initWebSocket() {
  ws = new WebSocket('ws://localhost:8080');

  ws.onopen = () => {
    console.log('WebSocket connected');
    showWSStatus(true);
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleWebSocketMessage(message);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    showWSStatus(false);
    // Reconnect after 5 seconds
    setTimeout(initWebSocket, 5000);
  };
}

function handleWebSocketMessage(message) {
  if (message.type === 'environment_update') {
    updateEnvironmentDisplay(message.data);
  } else if (message.type === 'alert') {
    showNotification(message.data);
    loadDashboard();
  }
}

function showWSStatus(connected) {
  const existing = document.querySelector('.ws-status');
  if (existing) existing.remove();

  const status = document.createElement('div');
  status.className = `ws-status ${connected ? 'ws-connected' : 'ws-disconnected'}`;
  status.textContent = connected ? 'Live Updates Connected' : 'Reconnecting...';
  document.body.appendChild(status);
}

// Tab Navigation
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');

  // Load tab data
  switch(tabName) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'batches':
      loadBatches();
      break;
    case 'environment':
      loadEnvironmentTab();
      break;
    case 'analytics':
      loadAnalytics();
      break;
  }
}

// Dashboard Functions
async function loadDashboard() {
  try {
    // Load statistics
    const batches = await fetch(`${API_URL}/batches`).then(r => r.json());
    const analytics = await fetch(`${API_URL}/analytics`).then(r => r.json());

    document.getElementById('activeBatchCount').textContent = batches.length;
    document.getElementById('monthlyYield').textContent = analytics.totalYield?.[0]?.total || 0;
    document.getElementById('alertCount').textContent = analytics.recentAlerts?.[0]?.count || 0;

    // Load recent environment data
    if (batches.length > 0) {
      const envData = await fetch(`${API_URL}/environment/${batches[0].id}/latest`).then(r => r.json());
      document.getElementById('avgTemp').textContent = envData.temperature || '-';
    }

    // Load alerts
    loadRecentAlerts();
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

async function loadRecentAlerts() {
  try {
    const batches = await fetch(`${API_URL}/batches`).then(r => r.json());
    const alertsList = document.getElementById('alertsList');
    alertsList.innerHTML = '';

    for (const batch of batches) {
      const alerts = await fetch(`${API_URL}/alerts/${batch.id}`).then(r => r.json());

      alerts.forEach(alert => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-item ${alert.severity}`;
        alertDiv.innerHTML = `
          <div class="alert-message">${alert.message}</div>
          <div class="alert-time">Batch: ${batch.strain} - ${new Date(alert.timestamp).toLocaleString()}</div>
        `;
        alertsList.appendChild(alertDiv);
      });
    }

    if (alertsList.children.length === 0) {
      alertsList.innerHTML = '<p style="color: #666;">No active alerts</p>';
    }
  } catch (error) {
    console.error('Error loading alerts:', error);
  }
}

// Batch Management
function showNewBatchForm() {
  document.getElementById('newBatchForm').classList.remove('hidden');
}

function hideNewBatchForm() {
  document.getElementById('newBatchForm').classList.add('hidden');
  document.getElementById('newBatchForm').querySelector('form').reset();
}

async function createBatch(event) {
  event.preventDefault();

  const batchData = {
    strain: document.getElementById('strain').value,
    substrate: document.getElementById('substrate').value,
    expected_harvest: document.getElementById('expectedHarvest').value,
    notes: document.getElementById('notes').value
  };

  try {
    const response = await fetch(`${API_URL}/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchData)
    });

    if (response.ok) {
      hideNewBatchForm();
      loadBatches();
      showNotification({ message: 'New batch created successfully!', severity: 'low' });
    }
  } catch (error) {
    console.error('Error creating batch:', error);
  }
}

async function loadBatches() {
  try {
    const batches = await fetch(`${API_URL}/batches`).then(r => r.json());
    const batchesList = document.getElementById('batchesList');
    batchesList.innerHTML = '';

    batches.forEach(batch => {
      const batchCard = document.createElement('div');
      batchCard.className = 'batch-card';
      batchCard.innerHTML = `
        <div class="batch-header">
          <div class="batch-strain">${batch.strain}</div>
          <div class="batch-stage stage-${batch.stage}">${batch.stage}</div>
        </div>
        <div class="batch-info">
          <div>Substrate: ${batch.substrate}</div>
          <div>Started: ${new Date(batch.start_date).toLocaleDateString()}</div>
          <div>Expected: ${new Date(batch.expected_harvest).toLocaleDateString()}</div>
          <div>ID: #${batch.id}</div>
        </div>
        <div class="batch-actions">
          <button class="btn-primary" onclick="updateStage(${batch.id})">Update Stage</button>
          <button class="btn-secondary" onclick="recordHarvest(${batch.id})">Record Harvest</button>
        </div>
      `;
      batchesList.appendChild(batchCard);
    });
  } catch (error) {
    console.error('Error loading batches:', error);
  }
}

async function updateStage(batchId) {
  const stages = ['inoculation', 'colonization', 'fruiting', 'harvest_ready'];
  const stage = prompt('Enter new stage: ' + stages.join(', '));

  if (stage && stages.includes(stage)) {
    try {
      const response = await fetch(`${API_URL}/batches/${batchId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage })
      });

      if (response.ok) {
        loadBatches();
        showNotification({ message: 'Stage updated successfully!', severity: 'low' });
      }
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  }
}

async function recordHarvest(batchId) {
  const weight = prompt('Enter harvest weight (lbs):');
  const quality = prompt('Enter quality grade (A, B, C):');
  const price = prompt('Enter market price per lb:');

  if (weight && quality && price) {
    try {
      const response = await fetch(`${API_URL}/harvests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: batchId,
          weight: parseFloat(weight),
          quality_grade: quality,
          market_price: parseFloat(price),
          notes: ''
        })
      });

      if (response.ok) {
        loadBatches();
        showNotification({ message: 'Harvest recorded successfully!', severity: 'low' });
      }
    } catch (error) {
      console.error('Error recording harvest:', error);
    }
  }
}

// Environment Monitoring
async function loadEnvironmentTab() {
  try {
    const batches = await fetch(`${API_URL}/batches`).then(r => r.json());
    const select = document.getElementById('envBatchSelect');

    select.innerHTML = '<option value="">Select batch to monitor...</option>';
    batches.forEach(batch => {
      const option = document.createElement('option');
      option.value = batch.id;
      option.textContent = `${batch.strain} - Started ${new Date(batch.start_date).toLocaleDateString()}`;
      select.appendChild(option);
    });

    if (currentBatchId) {
      select.value = currentBatchId;
      loadEnvironmentData();
    }
  } catch (error) {
    console.error('Error loading environment tab:', error);
  }
}

async function loadEnvironmentData() {
  const batchId = document.getElementById('envBatchSelect').value;
  if (!batchId) return;

  currentBatchId = batchId;

  try {
    // Load latest data
    const latest = await fetch(`${API_URL}/environment/${batchId}/latest`).then(r => r.json());
    updateEnvironmentDisplay(latest);

    // Load history for chart
    const history = await fetch(`${API_URL}/environment/${batchId}/history?hours=24`).then(r => r.json());
    updateEnvironmentChart(history);
  } catch (error) {
    console.error('Error loading environment data:', error);
  }
}

function updateEnvironmentDisplay(data) {
  if (!data) return;

  document.getElementById('currentTemp').textContent = data.temperature || '-';
  document.getElementById('currentHumidity').textContent = data.humidity || '-';
  document.getElementById('currentCO2').textContent = data.co2_level || '-';
  document.getElementById('currentLight').textContent = data.light_hours || '-';
}

function updateEnvironmentChart(history) {
  const ctx = document.getElementById('envChart').getContext('2d');

  if (envChart) {
    envChart.destroy();
  }

  const labels = history.map(h => new Date(h.timestamp).toLocaleTimeString());

  envChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.reverse(),
      datasets: [
        {
          label: 'Temperature (°F)',
          data: history.map(h => h.temperature).reverse(),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          yAxisID: 'y'
        },
        {
          label: 'Humidity (%)',
          data: history.map(h => h.humidity).reverse(),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left'
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

async function logEnvironment(event) {
  event.preventDefault();

  const batchId = document.getElementById('envBatchSelect').value;
  if (!batchId) {
    alert('Please select a batch first');
    return;
  }

  const data = {
    batch_id: parseInt(batchId),
    temperature: parseFloat(document.getElementById('manualTemp').value),
    humidity: parseFloat(document.getElementById('manualHumidity').value),
    co2_level: parseFloat(document.getElementById('manualCO2').value),
    light_hours: parseFloat(document.getElementById('manualLight').value)
  };

  try {
    const response = await fetch(`${API_URL}/environment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      event.target.reset();
      showNotification({ message: 'Environment data logged!', severity: 'low' });
      loadEnvironmentData();
    }
  } catch (error) {
    console.error('Error logging environment:', error);
  }
}

// Analytics
async function loadAnalytics() {
  try {
    const analytics = await fetch(`${API_URL}/analytics`).then(r => r.json());

    // Yield by strain chart
    if (analytics.avgYieldByStrain && analytics.avgYieldByStrain.length > 0) {
      const ctx1 = document.getElementById('yieldChart').getContext('2d');
      new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: analytics.avgYieldByStrain.map(s => s.strain),
          datasets: [{
            label: 'Average Yield (lbs)',
            data: analytics.avgYieldByStrain.map(s => s.avg_yield),
            backgroundColor: 'rgba(139, 69, 19, 0.6)',
            borderColor: 'rgb(139, 69, 19)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    // Update metrics table
    const metricsBody = document.getElementById('metricsBody');
    metricsBody.innerHTML = '';

    analytics.avgYieldByStrain?.forEach(strain => {
      const row = metricsBody.insertRow();
      row.innerHTML = `
        <td>${strain.strain}</td>
        <td>${strain.batch_count}</td>
        <td>${strain.avg_yield?.toFixed(2) || 0}</td>
        <td>100%</td>
      `;
    });
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
}

// Utility Functions
function showNotification(data) {
  // Simple notification - you could enhance this with a toast library
  console.log('Notification:', data.message);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
  loadDashboard();
});