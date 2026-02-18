import express from "express";
const router = express.Router();
import {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  getStaffList,
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

// Tất cả các routes user đều cần login
router.use(protect);

// Route công khai cho nhân viên gán đơn/xe (chỉ lấy id/name)
router.get("/staff-list", getStaffList);

// Các routes quản lý cần quyền admin
router.use(authorize("admin"));

router.route("/").post(createUser).get(getUsers);
router.route("/:id").put(updateUser).delete(deleteUser);

export default router;
