import express from "express";
import {
  login,
  loginWithMicrosoft,
  loginWithGoogle,
  getDemoSessionToken,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/microsoft", loginWithMicrosoft);
router.post("/google", loginWithGoogle);
router.post("/demo-token", getDemoSessionToken);

export default router;