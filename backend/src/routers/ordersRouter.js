import express from "express";
import {
  createOrder,
  deleteOrder,
  getAllOrders,
  getOrder,
  updateOrder,
  assignToVehicle,
  confirmWarehouse,
  confirmLeader,
  confirmOrderDetails,
  getSurplusDeficitData,
} from "../controllers/ordersController.js";

import { protect } from "../middleware/authMiddleware.js";
import {
  getWarehouseItems,
  confirmWarehouseBatch,
} from "../controllers/warehouseController.js";
import {
  getDispatcherItems,
  confirmDispatcherBatch,
} from "../controllers/dispatcherController.js";

const ordersRouter = express.Router();

// Route cho kho (đặt trước các route có param :id để tránh conflict)
ordersRouter.get("/warehouse-items", protect, getWarehouseItems);
ordersRouter.post("/warehouse-confirm-batch", protect, confirmWarehouseBatch);
ordersRouter.get("/dispatcher-items", protect, getDispatcherItems);
ordersRouter.post("/dispatcher-confirm-batch", protect, confirmDispatcherBatch);
ordersRouter.get("/surplus-deficit", protect, getSurplusDeficitData);

// CRUD cơ bản
ordersRouter.post("/", protect, createOrder);
ordersRouter.get("/", protect, getAllOrders);
ordersRouter.get("/:id", protect, getOrder);
ordersRouter.put("/:id", protect, updateOrder);
ordersRouter.delete("/:id", protect, deleteOrder);

// Các chức năng đặc biệt
ordersRouter.put("/:id/assign", protect, assignToVehicle); // Gán hoặc bỏ gán đơn vào xe
ordersRouter.put("/:id/assign-vehicle", protect, assignToVehicle); // Giữ lại để tương thích
ordersRouter.put(
  "/:orderId/items/:itemIndex/warehouse-confirm",
  protect,
  confirmWarehouse
);
ordersRouter.put(
  "/:orderId/items/:itemIndex/leader-confirm",
  protect,
  confirmLeader
);
ordersRouter.put("/:id/confirm-details", protect, confirmOrderDetails);

export default ordersRouter;
