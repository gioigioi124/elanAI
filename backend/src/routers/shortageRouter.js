import express from "express";
import {
  createCompensationOrder,
  ignoreShortage,
  getRemainingShortages,
} from "../controllers/shortageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Tất cả routes đều cần authenticate
router.use(protect);

/**
 * @route   POST /api/shortages/compensate
 * @desc    Tạo đơn bù hàng
 * @access  Private
 */
router.post("/compensate", createCompensationOrder);

/**
 * @route   PUT /api/shortages/ignore
 * @desc    Bỏ qua thiếu hàng
 * @access  Private
 */
router.put("/ignore", ignoreShortage);

/**
 * @route   GET /api/shortages/remaining
 * @desc    Lấy danh sách thiếu hàng còn lại
 * @access  Private
 * @query   customerId, warehouse, fromDate, toDate
 */
router.get("/remaining", getRemainingShortages);

export default router;
