import Order from "../models/Order.js";
import mongoose from "mongoose";

/**
 * Tạo đơn bù hàng
 * POST /api/shortages/compensate
 * Body: {
 *   customer: { name, customerCode, address, phone, note },
 *   orderDate: Date,
 *   items: [
 *     {
 *       sourceOrderId: ObjectId,
 *       sourceItemId: ObjectId,
 *       productName: String,
 *       size: String,
 *       unit: String,
 *       quantity: Number,  // Số lượng bù (phải <= shortageQty - compensatedQty)
 *       warehouse: String,
 *       cmQty: Number,
 *       note: String
 *     }
 *   ]
 * }
 */
export const createCompensationOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customer, orderDate, items, createdBy } = req.body;

    // Validate input
    if (!items || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Đơn bù phải có ít nhất 1 item",
      });
    }

    // Validate từng item và tính toán
    const validatedItems = [];
    const sourceItemUpdates = []; // Lưu các update cần thực hiện

    for (const item of items) {
      const { sourceOrderId, sourceItemId, quantity } = item;

      if (!sourceOrderId || !sourceItemId) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Mỗi item bù phải có sourceOrderId và sourceItemId",
        });
      }

      // Tìm order gốc và item gốc
      const sourceOrder = await Order.findById(sourceOrderId).session(session);
      if (!sourceOrder) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy đơn gốc ${sourceOrderId}`,
        });
      }

      const sourceItem = sourceOrder.items.id(sourceItemId);
      if (!sourceItem) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy item gốc ${sourceItemId} trong đơn ${sourceOrderId}`,
        });
      }

      // Kiểm tra trạng thái
      if (sourceItem.shortageStatus === "IGNORED") {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Item "${sourceItem.productName}" đã bị bỏ qua, không thể bù`,
        });
      }

      if (sourceItem.shortageStatus === "CLOSED") {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Item "${sourceItem.productName}" đã đóng, không thể bù thêm`,
        });
      }

      // Tính số lượng còn có thể bù
      const remainingShortage =
        sourceItem.shortageQty - sourceItem.compensatedQty;

      if (quantity > remainingShortage) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Item "${sourceItem.productName}": Số lượng bù (${quantity}) vượt quá số thiếu còn lại (${remainingShortage})`,
        });
      }

      // Thêm vào danh sách validated
      validatedItems.push({
        stt: validatedItems.length + 1,
        productName: item.productName || sourceItem.productName,
        size: item.size || sourceItem.size,
        unit: item.unit || sourceItem.unit,
        quantity: quantity,
        warehouse: item.warehouse || sourceItem.warehouse,
        cmQty: item.cmQty || 0,
        note: item.note || "",
        sourceItemId: sourceItemId,
        sourceOrderId: sourceOrderId,
        shortageQty: 0,
        compensatedQty: 0,
        shortageStatus: "OPEN",
      });

      // Lưu update cho item gốc
      sourceItemUpdates.push({
        order: sourceOrder,
        item: sourceItem,
        compensateQty: quantity,
      });
    }

    // Tạo đơn bù
    const compensationOrder = new Order({
      customer,
      orderDate: orderDate || new Date(),
      items: validatedItems,
      isCompensationOrder: true,
      createdBy: createdBy || req.user?._id,
    });

    await compensationOrder.save({ session });

    // Cập nhật compensatedQty và shortageStatus cho các item gốc
    for (const update of sourceItemUpdates) {
      const { order, item, compensateQty } = update;

      item.compensatedQty += compensateQty;

      // Nếu đã bù đủ → CLOSED
      if (item.compensatedQty >= item.shortageQty) {
        item.shortageStatus = "CLOSED";
      }

      await order.save({ session });
    }

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Tạo đơn bù thành công",
      data: compensationOrder,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error creating compensation order:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo đơn bù",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

/**
 * Bỏ qua thiếu hàng
 * PUT /api/shortages/ignore
 * Body: {
 *   orderId: ObjectId,
 *   itemId: ObjectId
 * }
 */
export const ignoreShortage = async (req, res) => {
  try {
    const { orderId, itemId } = req.body;

    if (!orderId || !itemId) {
      return res.status(400).json({
        success: false,
        message: "orderId và itemId là bắt buộc",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy item trong đơn hàng",
      });
    }

    // Kiểm tra trạng thái hiện tại
    if (item.shortageStatus === "CLOSED") {
      return res.status(400).json({
        success: false,
        message: "Item đã đóng, không thể bỏ qua",
      });
    }

    // Cập nhật trạng thái
    item.shortageStatus = "IGNORED";
    order.markModified("items");
    await order.save();

    res.status(200).json({
      success: true,
      message: "Đã bỏ qua thiếu hàng",
      data: order,
    });
  } catch (error) {
    console.error("Error ignoring shortage:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi bỏ qua thiếu hàng",
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách thiếu hàng còn lại
 * GET /api/shortages/remaining
 * Query params:
 *   - customerId: filter by customer ID
 *   - customerName: filter by customer name (partial match)
 *   - warehouse: filter by warehouse
 *   - fromDate, toDate: filter by orderDate
 */
export const getRemainingShortages = async (req, res) => {
  try {
    const { customerId, customerName, warehouse, fromDate, toDate } = req.query;

    // Build query
    const query = {
      // Lấy TẤT CẢ đơn có shortage (cả gốc và bù)
      // Đơn bù cũng có thể bị thiếu → tạo ra thiếu mới
      "items.shortageStatus": "OPEN", // Có item OPEN
    };

    if (customerId) {
      query["customer._id"] = customerId;
    }

    if (customerName) {
      // Escape special regex characters
      const escapedName = customerName
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query["customer.name"] = { $regex: escapedName, $options: "i" };
    }

    if (fromDate || toDate) {
      query.orderDate = {};
      if (fromDate) query.orderDate.$gte = new Date(fromDate);
      if (toDate) query.orderDate.$lte = new Date(toDate);
    }

    // Tìm orders
    const orders = await Order.find(query)
      .populate("vehicle", "licensePlate driver")
      .populate("createdBy", "name email")
      .sort({ orderDate: -1 });

    // Filter và format kết quả
    const result = [];

    for (const order of orders) {
      const shortageItems = order.items.filter((item) => {
        // Chỉ lấy item có:
        // 1. shortageStatus = OPEN
        // 2. shortageQty > compensatedQty
        const hasRemaining = item.shortageQty > item.compensatedQty;
        const isOpen = item.shortageStatus === "OPEN";
        const matchWarehouse = !warehouse || item.warehouse === warehouse;

        return hasRemaining && isOpen && matchWarehouse;
      });

      if (shortageItems.length > 0) {
        result.push({
          orderId: order._id,
          orderDate: order.orderDate,
          customer: order.customer,
          vehicle: order.vehicle,
          createdBy: order.createdBy,
          isCompensationOrder: order.isCompensationOrder || false, // Đánh dấu đơn bù
          shortageItems: shortageItems.map((item) => ({
            itemId: item._id,
            stt: item.stt,
            productName: item.productName,
            size: item.size,
            unit: item.unit,
            quantity: item.quantity,
            leaderConfirm: item.leaderConfirm?.value || 0,
            shortageQty: item.shortageQty,
            compensatedQty: item.compensatedQty,
            remainingShortage: item.shortageQty - item.compensatedQty,
            warehouse: item.warehouse,
            cmQty: item.cmQty || 0,
            cmQtyPerUnit: item.cmQtyPerUnit || 0,
            note: item.note,
          })),
        });
      }
    }

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Error getting remaining shortages:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách thiếu hàng",
      error: error.message,
    });
  }
};

/**
 * Tính toán lại shortageQty cho một order
 * Helper function - có thể gọi khi cập nhật leaderConfirm
 */
export const recalculateShortages = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    let hasChanges = false;

    for (const item of order.items) {
      const leaderConfirmValue = item.leaderConfirm?.value || 0;
      const newShortageQty = Math.max(item.quantity - leaderConfirmValue, 0);

      if (item.shortageQty !== newShortageQty) {
        item.shortageQty = newShortageQty;
        hasChanges = true;

        // Nếu không còn thiếu → CLOSED
        if (newShortageQty === 0) {
          item.shortageStatus = "CLOSED";
        }
        // Nếu đã bù đủ → CLOSED
        else if (item.compensatedQty >= newShortageQty) {
          item.shortageStatus = "CLOSED";
        }
        // Nếu có thiếu và chưa bù đủ → giữ nguyên hoặc mở lại
        else if (item.shortageStatus === "CLOSED") {
          item.shortageStatus = "OPEN";
        }
      }
    }

    if (hasChanges) {
      await order.save();
    }

    return order;
  } catch (error) {
    console.error("Error recalculating shortages:", error);
    throw error;
  }
};
