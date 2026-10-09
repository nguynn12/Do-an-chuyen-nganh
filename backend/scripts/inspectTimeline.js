import pool from "../src/config/database.js";

async function inspectTimeline() {
  console.log("=== TIMELINE CỦA ACTIVITIES & SUBMISSIONS ===");
  const [activities] = await pool.query(`
    SELECT 
      da.Course_Key,
      dc.Course_Code,
      da.Activity_Key,
      da.Activity_Name,
      da.Activity_Type,
      DATE_FORMAT(dd_due.Full_Date, '%Y-%m-%d') AS DueDate,
      DATE_FORMAT(MIN(dd_sub.Full_Date), '%Y-%m-%d') AS MinSubmitDate,
      DATE_FORMAT(MAX(dd_sub.Full_Date), '%Y-%m-%d') AS MaxSubmitDate,
      COUNT(fas.Submission_Key) AS TotalSubs
    FROM Dim_Activity da
    JOIN Dim_Course dc ON dc.Course_Key = da.Course_Key
    LEFT JOIN Dim_Date dd_due ON dd_due.Date_Key = da.Due_Date_Key
    LEFT JOIN Fact_Assignment_Submission fas ON fas.Activity_Key = da.Activity_Key
    LEFT JOIN Dim_Date dd_sub ON dd_sub.Date_Key = fas.Submit_Date_Key
    GROUP BY da.Activity_Key
    ORDER BY da.Course_Key, DueDate
  `);
  console.table(activities);

  console.log("\n=== TIMELINE CỦA DAILY ENGAGEMENT ===");
  const [engTimeline] = await pool.query(`
    SELECT 
      fde.Course_Key,
      dc.Course_Code,
      DATE_FORMAT(MIN(dd.Full_Date), '%Y-%m-%d') AS MinEngDate,
      DATE_FORMAT(MAX(dd.Full_Date), '%Y-%m-%d') AS MaxEngDate,
      COUNT(DISTINCT dd.Full_Date) AS TotalActiveDays,
      COUNT(*) AS TotalRecords
    FROM Fact_Daily_Engagement fde
    JOIN Dim_Course dc ON dc.Course_Key = fde.Course_Key
    JOIN Dim_Date dd ON dd.Date_Key = fde.Date_Key
    GROUP BY fde.Course_Key
  `);
  console.table(engTimeline);

  await pool.end();
}

inspectTimeline();
