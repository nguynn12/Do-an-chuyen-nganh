const dashboardService = require('../services/dashboard.service');

async function getOverview(req, res) {
    try {
        const data = await dashboardService.getOverview();

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard overview',
            error: error.message
        });
    }
}

async function getCourses(req, res) {
    try {
        const data = await dashboardService.getCourses();

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Failed to load course dashboard',
            error: error.message
        });
    }
}

async function getCourseDetail(req, res) {
    try {
        const courseKey = Number(req.params.courseKey);

        if (!Number.isInteger(courseKey) || courseKey <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid courseKey'
            });
        }

        const data =
            await dashboardService.getCourseDetail(courseKey);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Failed to load course detail',
            error: error.message
        });
    }
}

module.exports = {
    getOverview,
    getCourses,
    getCourseDetail
};