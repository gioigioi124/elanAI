import express from "express";
const router = express.Router();
import {
  loginUser,
  getMe,
  registerUser,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

router.post("/login", loginUser);
router.post("/register", registerUser);
router.get("/me", protect, getMe);

export default router;
