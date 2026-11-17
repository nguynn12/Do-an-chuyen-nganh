import pool from './backend/src/config/database.js';
import fs from 'node:fs';
import readline from 'node:readline';
import bcrypt from './backend/node_modules/bcryptjs/index.js';

async function run() {
  console.log('🚀 Đang chuẩn bị nạp sinh viên thật từ Data DLU...');
  
  // 1. Lấy danh sách student userids từ dlu_quiz_grades_cntt.csv
  const userIdsInQuiz = new Set();
  const quizGrades = [];
  const rl1 = readline.createInterface({
    input: fs.createReadStream('Data/Data_11-2026/Data_11-2026/dlu_quiz_grades_cntt.csv'),
    crlfDelay: Infinity
  });

  for await (const line of rl1) {
    const parts = line.split(',');
    if (parts.length >= 5) {
      const quizId = parts[1]?.replace(/"/g, '').trim();
      const uid = parts[2]?.replace(/"/g, '').trim();
      const grade = parts[3]?.replace(/"/g, '').trim();
      if (uid && grade && !isNaN(grade)) {
        userIdsInQuiz.add(uid);
        quizGrades.push({ quizId: Number(quizId), moodleUserId: Number(uid), grade: Number(grade) });
      }
    }
  }

  // 2. Thu thập thông tin sinh viên thật từ Data/NEW/NEW/dlu_user.csv
  const rl2 = readline.createInterface({
    input: fs.createReadStream('Data/NEW/NEW/dlu_user.csv'),
    crlfDelay: Infinity
  });

  const realStudents = new Map();
  for await (const line of rl2) {
    const parts = line.split(',');
    if (parts.length >= 10) {
      const uid = parts[0]?.replace(/"/g, '').trim();
      if (userIdsInQuiz.has(uid) && !realStudents.has(uid)) {
        const username = parts[5]?.replace(/"/g, '').trim();
        const email = parts[7]?.replace(/"/g, '').trim() || `${username}@dlu.edu.vn`;
        const firstName = parts[8]?.replace(/"/g, '').trim() || '';
        const lastName = parts[9]?.replace(/"/g, '').trim() || '';
        const fullName = `${firstName} ${lastName}`.trim();

        // Lọc MSSV chuẩn 7 chữ số (ví dụ: 2111867, 2211982, 2311005)
        if (username && /^\d{7}$/.test(username) && fullName) {
          realStudents.set(uid, {
            moodleUserId: Number(uid),
            username,
            firstName,
            lastName,
            fullName,
            email
          });
          if (realStudents.size >= 150) break;
        }
      }
    }
  }

  console.log(`✅ Đã chọn lọc ${realStudents.size} sinh viên CNTT thật.`);

  // 3. Nạp vào mdl_user, Dim_User, app_user_account
  const passwordHash = await bcrypt.hash('123456', 10);
  const userMap = new Map(); // moodleUserId -> User_Key

  for (const s of realStudents.values()) {
    // mdl_user
    await pool.query(`
      INSERT INTO lms_moodle_source.mdl_user (id, username, firstname, lastname, email, deleted, timecreated, timemodified)
      VALUES (?, ?, ?, ?, ?, 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
      ON DUPLICATE KEY UPDATE firstname=VALUES(firstname), lastname=VALUES(lastname), email=VALUES(email)
    `, [s.moodleUserId, s.username, s.firstName, s.lastName, s.email]);

    // Dim_User
    const [dimUser] = await pool.query(`
      INSERT INTO Dim_User (Moodle_User_ID, Username, First_Name, Last_Name, Full_Name, Email, Primary_Role, Is_Active)
      VALUES (?, ?, ?, ?, ?, ?, 'Student', 1)
      ON DUPLICATE KEY UPDATE Full_Name=VALUES(Full_Name), Email=VALUES(Email), Primary_Role='Student'
    `, [s.moodleUserId, s.username, s.firstName, s.lastName, s.fullName, s.email]);

    const [uRow] = await pool.query('SELECT User_Key FROM Dim_User WHERE Moodle_User_ID = ?', [s.moodleUserId]);
    const userKey = uRow[0]?.User_Key || dimUser.insertId;
    userMap.set(s.moodleUserId, userKey);

    // app_user_account
    await pool.query(`
      INSERT INTO app_user_account (User_Key, Username, Password_Hash, Role, Is_Active)
      VALUES (?, ?, ?, 'student', 1)
      ON DUPLICATE KEY UPDATE Password_Hash=VALUES(Password_Hash)
    `, [userKey, s.username, passwordHash]);
  }

  console.log('✅ Đã nạp xong tài khoản và thông tin sinh viên thật.');

  // 4. Gán sinh viên vào các khóa học thật trong Fact_Enrolment
  const [courses] = await pool.query('SELECT Course_Key, Moodle_Course_ID FROM Dim_Course WHERE Course_Key >= 8 LIMIT 25');
  let enrolCount = 0;
  for (const c of courses) {
    // Phân bổ ~25 sinh viên ngẫu nhiên vào mỗi môn
    let count = 0;
    for (const [moodleId, userKey] of userMap.entries()) {
      if ((userKey + c.Course_Key) % 3 === 0) {
        await pool.query(`
          INSERT INTO Fact_Enrolment (User_Key, Course_Key, Enrol_Date_Key, Status)
          VALUES (?, ?, 20260105, 'Active')
          ON DUPLICATE KEY UPDATE Status='Active'
        `, [userKey, c.Course_Key]);
        enrolCount++;
        count++;
      }
      if (count >= 25) break;
    }
  }
  console.log(`✅ Đã tạo ${enrolCount} lượt ghi danh sinh viên thật vào các môn học.`);

  // 5. Gán điểm thi Quiz thật vào Fact_Course_Grade
  const [activities] = await pool.query('SELECT Activity_Key, Moodle_Module_ID, Course_Key, Activity_Name FROM Dim_Activity WHERE Activity_Type = "quiz"');
  const actMap = new Map();
  for (const a of activities) {
    actMap.set(a.Moodle_Module_ID, a);
  }

  let gradeCount = 0;
  for (const qg of quizGrades) {
    const userKey = userMap.get(qg.moodleUserId);
    const act = actMap.get(qg.quizId);
    if (userKey && act) {
      const isPassed = qg.grade >= 5 ? 1 : 0;
      const pct = Math.min(100, Math.round((qg.grade / 10) * 100));
      await pool.query(`
        INSERT INTO Fact_Course_Grade (User_Key, Course_Key, Grade_Item_ID, Grade_Item_Name, Grade_Item_Type, Activity_Key, Date_Key, Grade, Max_Grade, Grade_Percentage, Is_Passed)
        VALUES (?, ?, ?, ?, 'quiz', ?, 20260315, ?, 10.0, ?, ?)
        ON DUPLICATE KEY UPDATE Grade=VALUES(Grade), Grade_Percentage=VALUES(Grade_Percentage)
      `, [userKey, act.Course_Key, qg.quizId, act.Activity_Name, act.Activity_Key, qg.grade, pct, isPassed]);
      gradeCount++;
      if (gradeCount >= 300) break;
    }
  }
  console.log(`✅ Đã nạp ${gradeCount} đầu điểm Quiz thật cho sinh viên.`);
  console.log('🎉 Hoàn tất nạp sinh viên thật DLU!');
}

try {
  await run();
} finally {
  await pool.end();
}
