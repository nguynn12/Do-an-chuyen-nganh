const express = require('express');

const dashboardController =
    require('../controllers/dashboard.controller');

const router = express.Router();

router.get(
    '/overview',
    dashboardController.getOverview
);

router.get(
    '/courses',
    dashboardController.getCourses
);

router.get(
    '/courses/:courseKey',
    dashboardController.getCourseDetail
);

module.exports = router;