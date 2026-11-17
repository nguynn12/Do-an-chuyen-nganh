import pool from '../../config/database.js';
import {buildClassGradeWorkbook} from '../services/gradeExportService.js';

export async function exportClassGrades(req,res) {
  let connection;
  try {
    connection=await pool.getConnection();
    await connection.beginTransaction();
    const result=await buildClassGradeWorkbook(connection,req.course,req.query.cohort || 'K47');
    await connection.commit();
    const buffer=await result.workbook.xlsx.writeBuffer();
    const code=String(req.course.Course_Code || req.course.Moodle_Course_ID).replace(/[^a-zA-Z0-9_-]/g,'_');
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename="Bang_diem_${code}_${result.cohort}.xlsx"`);
    res.setHeader('Cache-Control','no-store');
    return res.send(Buffer.from(buffer));
  } catch(error) {
    if(connection)await connection.rollback();
    console.error('[Grade export]',error.message);
    return res.status(error.status || 500).json({success:false,message:error.status ? error.message : 'Không xuất được bảng điểm. Vui lòng thử lại.'});
  } finally {connection?.release();}
}
