import express from "express";
import {
  getConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
} from "../controllers/conversationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getConversations);
router.get("/:id", protect, getConversation);
router.post("/", protect, createConversation);
router.put("/:id", protect, updateConversation);
router.delete("/:id", protect, deleteConversation);

export default router;
