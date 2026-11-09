import pool from '../src/config/database.js';
try {
  const columns = {
    End_Time: 'TIME NULL',
    Location: 'VARCHAR(255) NULL',
    Meeting_Url: 'VARCHAR(2048) NULL',
    Series_ID: 'CHAR(36) NULL',
  };
  const [rows] = await pool.query('SHOW COLUMNS FROM Teacher_Schedule');
  const existing = new Set(rows.map(row => row.Field));
  for (const [name, definition] of Object.entries(columns)) {
    if (!existing.has(name)) {
      await pool.query(`ALTER TABLE Teacher_Schedule ADD COLUMN ${name} ${definition}`);
      console.log(`Added ${name}`);
    }
  }
  console.log('Schedule planning schema ready');
} finally { await pool.end(); }
