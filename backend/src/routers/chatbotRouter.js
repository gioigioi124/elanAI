import express from "express";
import multer from "multer";
import {
  uploadKnowledgeBase,
  chat,
  deleteKnowledgeBase,
  getKnowledgeSources,
} from "../controllers/chatbotController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/files", protect, authorize("admin"), getKnowledgeSources);
router.post(
  "/upload",
  protect,
  authorize("admin"),
  upload.array("files", 10),
  uploadKnowledgeBase,
); // Max 10 files
router.post("/delete-file", protect, authorize("admin"), deleteKnowledgeBase);
router.post("/message", chat); // Chat can be public or semi-public depending on use case

export default router;
