import express from "express";
import multer from "multer";
import {
  uploadCustomers,
  searchCustomers,
  getAllCustomers,
  deleteCustomer,
  updateCustomerDebt,
} from "../controllers/customerController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Configure multer for memory storage (no disk write)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only Excel files (case-insensitive comparison)
    const allowedMimes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel.sheet.macroenabled.12",
    ];
    if (allowedMimes.some((m) => m === file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file Excel (.xls, .xlsx, .xlsm)"));
    }
  },
});

// Upload Excel file - Admin only
router.post(
  "/upload",
  protect,
  authorize("admin"),
  upload.single("file"),
  uploadCustomers,
);

// Search customers - All authenticated users
router.get("/search", protect, searchCustomers);

// Get all customers with pagination - All authenticated users
router.get("/", protect, getAllCustomers);

// Update customer debt - Admin only
router.patch("/:id/debt", protect, authorize("admin"), updateCustomerDebt);

// Delete customer - Admin only
router.delete("/:id", protect, authorize("admin"), deleteCustomer);

export default router;
