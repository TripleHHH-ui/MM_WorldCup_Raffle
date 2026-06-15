const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS raffle_data (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const res = await pool.query('SELECT COUNT(*) FROM raffle_data');
  if (parseInt(res.rows[0].count) === 0) {
    await pool.query('INSERT INTO raffle_data (id, data) VALUES (1, $1)', [
      JSON.stringify({ draws: [], locked: false, lastUpdated: null })
    ]);
  }
};
initDb().catch(err => console.error("DB Init Error:", err));

app.get('/api/raffle', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM raffle_data WHERE id = 1');
    res.json(result.rows[0].data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
