import {readFile} from 'node:fs/promises';
import pool from '../src/config/database.js';
await pool.query(await readFile(new URL('../../Database/35_grade_web_persistence.sql',import.meta.url),'utf8'));
console.log('Migration web_grade_confirmation: OK');
await pool.end();
