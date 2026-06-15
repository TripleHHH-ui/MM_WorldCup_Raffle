const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS so your Hugging Face Space can talk to this server
app.use(cors());
app.use(express.json());

// Connect to Railway's PostgreSQL database using the environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize database table if it doesn't exist
const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS raffle_data (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Seed initial structure if empty
  const res = await pool.query('SELECT COUNT(*) FROM raffle_data');
  if (parseInt(res.rows[0].count) === 0) {
    await pool.query('INSERT INTO raffle_data (id, data) VALUES (1, $1)', [
      JSON.stringify({ draws: [], locked: false, lastUpdated: null })
    ]);
  }
};
initDb().catch(err => console.error("DB Init Error:", err));

// Route to GET the current raffle state
app.get('/api/raffle', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM raffle_data WHERE id = 1');
    res.json(result.rows[0].data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to UPDATE/POST the new raffle state
app.post('/api/raffle', async (req, res) => {
  try {
    const newData = req.body;
    newData.lastUpdated = new Date().toISOString();
    
    await pool.query('UPDATE raffle_data SET data = $1, updated_at = NOW() WHERE id = 1', [
      JSON.stringify(newData)
    ]);
    res.json({ success: true, data: newData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});