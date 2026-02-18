import express from "express";
const router = express.Router();
import { loginUser, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

router.post("/login", loginUser);
router.get("/me", protect, getMe);

export default router;
