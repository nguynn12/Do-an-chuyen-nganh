const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/db');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

app.use(cors());
app.use(express.json());


// ============================================================
// TEST SERVER
// ============================================================

app.get('/', (req, res) => {
    res.json({
        message: 'LMS Dashboard API is running'
    });
});


// ============================================================
// TEST DATABASE
// ============================================================

app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM Dim_User)
                    AS totalUsers,

                (SELECT COUNT(*) FROM Dim_Course)
                    AS totalCourses,

                (SELECT COUNT(*) FROM Dim_Activity)
                    AS totalActivities
        `);

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
});


// ============================================================
// DASHBOARD ROUTES
// ============================================================

app.use(
    '/api/dashboard',
    dashboardRoutes
);


// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `Server running at http://localhost:${PORT}`
    );
});