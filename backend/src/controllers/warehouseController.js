import Order from "../models/Order.js";

// @desc    Get items for a specific warehouse within a date range
// @route   GET /api/orders/warehouse-items
// @access  Private (Warehouse only)
export const getWarehouseItems = async (req, res) => {
  try {
    const { fromDate, toDate, status, page = 1, limit = 50 } = req.query;
    const warehouseCode = req.user.warehouseCode; // Lấy từ token của user

    // Validate permission
    if (req.user.role !== "warehouse" || !warehouseCode) {
      return res
        .status(403)
        .json({ message: "Không có quyền truy cập kho này" });
    }

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

    // Find orders that *might* contain items for this warehouse
    // Optimization: query orders where items.warehouse == warehouseCode
    filter["items.warehouse"] = warehouseCode;

    const orders = await Order.find(filter)
      .populate("customer", "name note") // Populate customer info if it was a ref (here it's embedded object but good practice)
      .sort({ orderDate: -1, createdAt: -1 });

    // Flatten items logic
    let warehouseItems = [];

    orders.forEach((order) => {
      // Filter items specifically for this warehouse
      const relevantItems = order.items.filter(
        (item) => item.warehouse === warehouseCode
      );

      relevantItems.forEach((item) => {
        const confirmValue = item.warehouseConfirm?.value || "";

        // Apply status filter
        if (status === "confirmed" && !confirmValue) return;
        if (status === "unconfirmed" && confirmValue) return;

        warehouseItems.push({
          orderId: order._id, // Để update sau này
          itemIndex: order.items.indexOf(item), // Index trong mảng gốc của order (quan trọng) -> wait, indexOf works if ref is same, but better rely on _id if item has subschema id, OR careful logic.
          // Mongoose subdocs have _id by default. using item._id is safer for finding.
          itemId: item._id,

          orderDate: order.orderDate,
          customerName: order.customer.name,
          customerNote: order.customer.note,
          creator: "Staff", // TODO: Nếu có thông tin người tạo order thì thêm vào model Order

          productName: item.productName,
          size: item.size,
          unit: item.unit,
          quantity: item.quantity,
          cmQty: item.cmQty,
          note: item.note,
          warehouseConfirm: item.warehouseConfirm?.value || "",
        });
      });
    });

    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const totalItems = warehouseItems.length;
    const totalPages = Math.ceil(totalItems / limitNum);
    const skip = (pageNum - 1) * limitNum;

    // Slice the items array for current page
    const paginatedItems = warehouseItems.slice(skip, skip + limitNum);

    // Return paginated response with metadata
    res.json({
      items: paginatedItems,
      currentPage: pageNum,
      totalPages,
      totalItems,
      itemsPerPage: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi lấy dữ liệu kho", error: error.message });
  }
};

// @desc    Batch confirm items for warehouse
// @route   POST /api/orders/warehouse-confirm-batch
export const confirmWarehouseBatch = async (req, res) => {
  try {
    const { updates } = req.body; // Array of { orderId, itemIndex, value }
    const warehouseCode = req.user.warehouseCode;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    const results = [];
    const errors = [];

    // Process updates
    for (const update of updates) {
      const { orderId, itemIndex, value } = update;
      try {
        const order = await Order.findById(orderId);
        if (!order) {
          errors.push({ orderId, message: "Không tìm thấy đơn hàng" });
          continue;
        }

        const item = order.items[itemIndex];
        if (!item) {
          errors.push({ orderId, message: "Không tìm thấy item" });
          continue;
        }

        // Check permission
        if (req.user.role === "warehouse" && item.warehouse !== warehouseCode) {
          errors.push({ orderId, message: "Không có quyền xác nhận kho này" });
          continue;
        }

        // Update
        item.warehouseConfirm = {
          value: value,
          confirmedAt: new Date(),
        };

        await order.save();
        results.push({ orderId, success: true });
      } catch (err) {
        errors.push({ orderId, message: err.message });
      }
    }

    res.json({
      message: `Đã xử lý ${updates.length} yêu cầu`,
      successCount: results.length,
      errorCount: errors.length,
      errors,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi batch confirm", error: error.message });
  }
};
