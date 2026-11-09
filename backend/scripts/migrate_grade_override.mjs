import pool from '../src/config/database.js';
import {readFile} from 'node:fs/promises';
await pool.query(await readFile(new URL('../../Database/36_grade_override_view.sql',import.meta.url),'utf8'));
const [rows]=await pool.query('SELECT COUNT(*) AS count FROM web_grade_item_override');
console.log(`View web_grade_item_override ready; ${rows[0].count} saved item scores`);await pool.end();
