import Order from "../models/Order.js";

// @desc    Get all items for dispatchers/leaders within a date range and creator filter
// @route   GET /api/orders/dispatcher-items
// @access  Private (Leader/Admin)
export const getDispatcherItems = async (req, res) => {
  try {
    const { fromDate, toDate, creator, status } = req.query;

    // Build filter for Order
    const filter = {};

    // Filter by date
    if (fromDate || toDate) {
      filter.orderDate = {};
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        filter.orderDate.$gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        filter.orderDate.$lte = to;
      }
    }

    // Filter by creator
    if (creator && creator !== "all") {
      filter.createdBy = creator;
    }

    // Leader views orders that are assigned to vehicles (usually)
    // Actually, maybe show all orders for that day?
    // The user said "điều vận", so it's likely about orders assigned to vehicles.
    // Let's not restrict to assigned only unless requested,
    // but usually dispatcher only cares about what's going into vehicles.

    const orders = await Order.find(filter)
      .populate("vehicle", "licensePlate")
      .populate("createdBy", "name")
      .sort({ orderDate: -1, createdAt: -1 });

    // Flatten items logic
    let dispatcherItems = [];

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const leaderConfirmValue = item.leaderConfirm?.value || "";

        // Apply status filter (if needed)
        if (status === "confirmed" && !leaderConfirmValue) return;
        if (status === "unconfirmed" && leaderConfirmValue) return;

        dispatcherItems.push({
          orderId: order._id,
          itemIndex: order.items.indexOf(item),
          itemId: item._id,

          orderDate: order.orderDate,
          customerName: order.customer?.name || "N/A",
          customerNote: order.customer?.note || "",
          creatorName: order.createdBy?.name || "N/A",
          vehiclePlate: order.vehicle?.licensePlate || "Chưa gán",

          productName: item.productName,
          size: item.size,
          unit: item.unit,
          quantity: item.quantity,
          cmQty: item.cmQty,
          note: item.note,
          warehouseConfirm: item.warehouseConfirm?.value || "",
          leaderConfirm: item.leaderConfirm?.value || "",
        });
      });
    });

    res.json(dispatcherItems);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi lấy dữ liệu điều vận", error: error.message });
  }
};

// @desc    Batch confirm items for dispatcher/leader
// @route   POST /api/orders/dispatcher-confirm-batch
export const confirmDispatcherBatch = async (req, res) => {
  try {
    const { updates } = req.body; // Array of { orderId, itemIndex, leaderValue, warehouseValue }

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    const results = [];
    const errors = [];

    // Group updates by orderId to minimize database saves
    const updatesByOrder = updates.reduce((acc, update) => {
      if (!acc[update.orderId]) acc[update.orderId] = [];
      acc[update.orderId].push(update);
      return acc;
    }, {});

    for (const orderId in updatesByOrder) {
      try {
        const order = await Order.findById(orderId);
        if (!order) {
          errors.push({ orderId, message: "Không tìm thấy đơn hàng" });
          continue;
        }

        updatesByOrder[orderId].forEach((update) => {
          const item = order.items[update.itemIndex];
          if (item) {
            // Update leader confirm
            if (update.leaderValue !== undefined) {
              item.leaderConfirm = {
                value: update.leaderValue,
                confirmedAt: new Date(),
              };

              // Tự động tính shortageQty = max(quantity - leaderConfirm, 0)
              const leaderValueNum = parseFloat(update.leaderValue) || 0;
              const shortage = Math.max(item.quantity - leaderValueNum, 0);
              item.shortageQty = shortage;

              // Cập nhật cmQty dựa trên số lượng được xác nhận
              // Ưu tiên sử dụng cmQtyPerUnit nếu có, nếu không thì tính từ cmQty/quantity ban đầu
              if (item.cmQtyPerUnit && item.cmQtyPerUnit > 0) {
                item.cmQty = leaderValueNum * item.cmQtyPerUnit;
              } else if (item.cmQty && item.quantity && item.quantity > 0) {
                const cmPerUnit = item.cmQty / item.quantity;
                item.cmQty = leaderValueNum * cmPerUnit;
              }

              // Cập nhật shortageStatus
              if (shortage === 0) {
                item.shortageStatus = "CLOSED";
              } else if (item.compensatedQty >= shortage) {
                item.shortageStatus = "CLOSED";
              } else if (item.shortageStatus !== "IGNORED") {
                item.shortageStatus = "OPEN";
              }
            }
            // Optional: update warehouse confirm if leader wants to override
            if (update.warehouseValue !== undefined) {
              item.warehouseConfirm = {
                value: update.warehouseValue,
                confirmedAt: new Date(),
              };
            }
          }
        });

        await order.save();
        results.push({ orderId, success: true });
      } catch (err) {
        errors.push({ orderId, message: err.message });
      }
    }

    res.json({
      message: `Đã xử lý xong`,
      successCount: results.length,
      errorCount: errors.length,
      errors,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi batch confirm điều vận", error: error.message });
  }
};
