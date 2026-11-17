import pool from '../src/config/database.js';
import {readFile} from 'node:fs/promises';
const sql=await readFile(new URL('../../Database/37_grade_ingestion.sql',import.meta.url),'utf8');
for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await pool.query(statement);
for(const table of ['Fact_Course_Grade','lms_moodle_source.mdl_grade_items','lms_moodle_source.mdl_grade_grades']) {
 const [rows]=await pool.query(`SHOW CREATE TABLE ${table}`); console.log(Object.values(rows[0])[1]);
}
console.log('Grade ingestion schema ready.');await pool.end();
