import express from "express";
import { compareClasses } from "../controllers/comparisonController.js";

const router = express.Router();

// GET /api/comparison
router.get("/", compareClasses);

export default router;