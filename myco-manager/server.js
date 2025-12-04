const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database
const db = new sqlite3.Database('./mushroom.db');

// Create tables
db.serialize(() => {
  // Cultivation batches table
  db.run(`CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strain TEXT NOT NULL,
    substrate TEXT NOT NULL,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    stage TEXT DEFAULT 'inoculation',
    expected_harvest DATE,
    actual_yield REAL,
    notes TEXT,
    status TEXT DEFAULT 'active'
  )`);

  // Environmental data table
  db.run(`CREATE TABLE IF NOT EXISTS environment_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    temperature REAL,
    humidity REAL,
    co2_level REAL,
    light_hours REAL,
    FOREIGN KEY (batch_id) REFERENCES batches (id)
  )`);

  // Alerts table
  db.run(`CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT,
    message TEXT,
    severity TEXT,
    resolved BOOLEAN DEFAULT 0,
    FOREIGN KEY (batch_id) REFERENCES batches (id)
  )`);

  // Harvest records
  db.run(`CREATE TABLE IF NOT EXISTS harvests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER,
    harvest_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    weight REAL,
    quality_grade TEXT,
    market_price REAL,
    notes TEXT,
    FOREIGN KEY (batch_id) REFERENCES batches (id)
  )`);
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: 8080 });

// API Routes

// Get all active batches
app.get('/api/batches', (req, res) => {
  db.all("SELECT * FROM batches WHERE status = 'active' ORDER BY start_date DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create new batch
app.post('/api/batches', (req, res) => {
  const { strain, substrate, expected_harvest, notes } = req.body;
  db.run(
    "INSERT INTO batches (strain, substrate, expected_harvest, notes) VALUES (?, ?, ?, ?)",
    [strain, substrate, expected_harvest, notes],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Update batch stage
app.put('/api/batches/:id/stage', (req, res) => {
  const { stage } = req.body;
  db.run(
    "UPDATE batches SET stage = ? WHERE id = ?",
    [stage, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Log environmental data
app.post('/api/environment', (req, res) => {
  const { batch_id, temperature, humidity, co2_level, light_hours } = req.body;

  // Check for anomalies
  checkEnvironmentalAnomalies(batch_id, temperature, humidity, co2_level);

  db.run(
    "INSERT INTO environment_logs (batch_id, temperature, humidity, co2_level, light_hours) VALUES (?, ?, ?, ?, ?)",
    [batch_id, temperature, humidity, co2_level, light_hours],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Broadcast to WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'environment_update',
            data: { batch_id, temperature, humidity, co2_level, light_hours }
          }));
        }
      });

      res.json({ success: true });
    }
  );
});

// Get latest environmental data for a batch
app.get('/api/environment/:batchId/latest', (req, res) => {
  db.get(
    "SELECT * FROM environment_logs WHERE batch_id = ? ORDER BY timestamp DESC LIMIT 1",
    [req.params.batchId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || {});
    }
  );
});

// Get environmental history
app.get('/api/environment/:batchId/history', (req, res) => {
  const hours = req.query.hours || 24;
  db.all(
    `SELECT * FROM environment_logs
     WHERE batch_id = ? AND timestamp > datetime('now', '-${hours} hours')
     ORDER BY timestamp DESC`,
    [req.params.batchId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get alerts
app.get('/api/alerts/:batchId', (req, res) => {
  db.all(
    "SELECT * FROM alerts WHERE batch_id = ? AND resolved = 0 ORDER BY timestamp DESC",
    [req.params.batchId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Record harvest
app.post('/api/harvests', (req, res) => {
  const { batch_id, weight, quality_grade, market_price, notes } = req.body;
  db.run(
    "INSERT INTO harvests (batch_id, weight, quality_grade, market_price, notes) VALUES (?, ?, ?, ?, ?)",
    [batch_id, weight, quality_grade, market_price, notes],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Update batch status
      db.run("UPDATE batches SET status = 'harvested', actual_yield = ? WHERE id = ?", [weight, batch_id]);

      res.json({ success: true });
    }
  );
});

// Get analytics
app.get('/api/analytics', (req, res) => {
  const queries = {
    totalBatches: "SELECT COUNT(*) as count FROM batches",
    activeBatches: "SELECT COUNT(*) as count FROM batches WHERE status = 'active'",
    totalYield: "SELECT SUM(actual_yield) as total FROM batches WHERE status = 'harvested'",
    avgYieldByStrain: `
      SELECT strain, AVG(actual_yield) as avg_yield, COUNT(*) as batch_count
      FROM batches WHERE status = 'harvested'
      GROUP BY strain
    `,
    recentAlerts: "SELECT COUNT(*) as count FROM alerts WHERE timestamp > datetime('now', '-7 days')"
  };

  const results = {};
  let completed = 0;

  Object.entries(queries).forEach(([key, query]) => {
    db.all(query, (err, rows) => {
      if (!err) results[key] = rows;
      completed++;
      if (completed === Object.keys(queries).length) {
        res.json(results);
      }
    });
  });
});

// Check for environmental anomalies
function checkEnvironmentalAnomalies(batch_id, temperature, humidity, co2_level) {
  const alerts = [];

  // Temperature thresholds (adjust based on mushroom species)
  if (temperature < 55 || temperature > 75) {
    alerts.push({
      type: 'temperature',
      message: `Temperature ${temperature}°F is outside optimal range (55-75°F)`,
      severity: temperature < 50 || temperature > 80 ? 'high' : 'medium'
    });
  }

  // Humidity thresholds
  if (humidity < 80 || humidity > 95) {
    alerts.push({
      type: 'humidity',
      message: `Humidity ${humidity}% is outside optimal range (80-95%)`,
      severity: humidity < 70 || humidity > 98 ? 'high' : 'medium'
    });
  }

  // CO2 thresholds (ppm)
  if (co2_level > 1000) {
    alerts.push({
      type: 'co2',
      message: `CO2 level ${co2_level}ppm is too high (should be <1000ppm)`,
      severity: co2_level > 1500 ? 'high' : 'medium'
    });
  }

  // Insert alerts
  alerts.forEach(alert => {
    db.run(
      "INSERT INTO alerts (batch_id, type, message, severity) VALUES (?, ?, ?, ?)",
      [batch_id, alert.type, alert.message, alert.severity]
    );

    // Send WebSocket alert
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'alert',
          data: { batch_id, ...alert }
        }));
      }
    });
  });
}

// Scheduled tasks
// Check for batches ready for stage transition every hour
cron.schedule('0 * * * *', () => {
  db.all(
    `SELECT id, strain, stage,
     julianday('now') - julianday(start_date) as days_elapsed
     FROM batches WHERE status = 'active'`,
    (err, batches) => {
      if (err) return;

      batches.forEach(batch => {
        let newStage = null;

        // Typical stage progression (adjust based on species)
        if (batch.stage === 'inoculation' && batch.days_elapsed >= 14) {
          newStage = 'colonization';
        } else if (batch.stage === 'colonization' && batch.days_elapsed >= 28) {
          newStage = 'fruiting';
        } else if (batch.stage === 'fruiting' && batch.days_elapsed >= 35) {
          newStage = 'harvest_ready';
        }

        if (newStage) {
          db.run("UPDATE batches SET stage = ? WHERE id = ?", [newStage, batch.id]);
          db.run(
            "INSERT INTO alerts (batch_id, type, message, severity) VALUES (?, ?, ?, ?)",
            [batch.id, 'stage_transition', `Batch ready for ${newStage} stage`, 'low']
          );
        }
      });
    }
  );
});

app.listen(port, () => {
  console.log(`MycoManager server running on port ${port}`);
  console.log(`WebSocket server running on port 8080`);
});