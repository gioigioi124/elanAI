import Order from "../models/Order.js";
import mongoose from "mongoose";

// CREATE - Tạo đơn hàng mới (hỗ trợ đơn hỗn hợp)
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, ...orderData } = req.body;

    // Phân loại items: bù và thường
    const compensationItems = items.filter(
      (item) => item.sourceOrderId && item.sourceItemId,
    );
    const normalItems = items.filter(
      (item) => !item.sourceOrderId || !item.sourceItemId,
    );

    // Validate và xử lý items bù
    for (const item of compensationItems) {
      const { sourceOrderId, sourceItemId, quantity } = item;

      // Tìm order gốc
      const sourceOrder = await Order.findById(sourceOrderId).session(session);
      if (!sourceOrder) {
        await session.abortTransaction();
        return res.status(404).json({
          message: `Không tìm thấy đơn gốc ${sourceOrderId}`,
        });
      }

      // Tìm item gốc
      const sourceItem = sourceOrder.items.id(sourceItemId);
      if (!sourceItem) {
        await session.abortTransaction();
        return res.status(404).json({
          message: `Không tìm thấy item gốc ${sourceItemId}`,
        });
      }

      // Validate số lượng bù
      const remainingShortage =
        sourceItem.shortageQty - sourceItem.compensatedQty;

      if (quantity > remainingShortage) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `Item "${sourceItem.productName}": Số lượng bù (${quantity}) vượt quá số thiếu còn lại (${remainingShortage})`,
        });
      }

      // Cập nhật compensatedQty
      sourceItem.compensatedQty += quantity;

      // Cập nhật status
      if (sourceItem.compensatedQty >= sourceItem.shortageQty) {
        sourceItem.shortageStatus = "CLOSED";
      }

      await sourceOrder.save({ session });
    }

    // Kiểm tra giới hạn công nợ của khách hàng
    let isOverDebtLimit = false;
    let debtWarning = null;

    if (orderData.customer?.customerCode) {
      const Customer = mongoose.model("Customer");
      const customer = await Customer.findOne({
        customerCode: orderData.customer.customerCode,
      }).session(session);

      if (
        customer &&
        customer.currentDebt > customer.debtLimit &&
        !customer.bypassDebtCheck
      ) {
        isOverDebtLimit = true;
        debtWarning = {
          message: "Khách hàng vượt hạn mức công nợ",
          debtLimit: customer.debtLimit,
          currentDebt: customer.currentDebt,
        };
      }
    }

    // Tạo đơn hàng (hỗn hợp hoặc thường)
    const order = await Order.create(
      [
        {
          ...orderData,
          items,
          createdBy: req.user._id,
          isOverDebtLimit,
          // Không set isCompensationOrder = true
          // Vì đây là đơn hỗn hợp, không phải đơn bù thuần túy
        },
      ],
      { session },
    );

    await session.commitTransaction();

    res.status(201).json({
      ...order[0].toObject(),
      debtWarning,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({
      message: "Tạo đơn hàng thất bại",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// GET ALL - Lấy tất cả đơn hàng
export const getAllOrders = async (req, res) => {
  try {
    const {
      vehicle,
      status,
      search,
      creator,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query; // Lọc theo xe, trạng thái, và tìm kiếm

    const filter = {};

    // Filter theo người tạo
    if (creator) {
      filter.createdBy = creator;
    }

    // Filter theo vehicle (nếu có)
    if (vehicle) {
      filter.vehicle = vehicle;
    }

    // Filter theo trạng thái gán xe
    if (status === "unassigned") {
      filter.vehicle = null; // Chưa gán xe
    } else if (status === "assigned") {
      filter.vehicle = { $ne: null }; // Đã gán xe
    }

    // Tìm kiếm theo tên khách hàng (case-insensitive)
    if (search && search.trim()) {
      filter["customer.name"] = {
        $regex: search.trim(),
        $options: "i", // Case-insensitive
      };
    }

    // Filter theo khoảng ngày (orderDate)
    if (fromDate || toDate) {
      filter.orderDate = {};
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0); // Start of day
        filter.orderDate.$gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999); // End of day
        filter.orderDate.$lte = to;
      }
    }

    // Tính toán pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Đếm tổng số đơn hàng
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limitNum);

    // Lấy dữ liệu đơn hàng với pagination
    const orders = await Order.find(filter)
      .populate("vehicle") // Lấy thông tin xe
      .populate("createdBy", "name username") // Lấy thông tin người tạo
      .sort({ orderDate: -1, createdAt: -1 }) // Sắp xếp theo orderDate, sau đó createdAt
      .skip(skip)
      .limit(limitNum);

    // Trả về dữ liệu với metadata
    res.status(200).json({
      orders,
      currentPage: pageNum,
      totalPages,
      totalOrders,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    });
  } catch (error) {
    res.status(500).json({
      message: "Lấy danh sách đơn hàng thất bại",
      error: error.message,
    });
  }
};

// GET ONE - Lấy 1 đơn hàng theo ID
export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate("vehicle");

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({
      message: "Lấy đơn hàng thất bại",
      error: error.message,
    });
  }
};

// UPDATE - Cập nhật đơn hàng
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const existingOrder = await Order.findById(id);

    if (!existingOrder) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Nếu có cập nhật items, kiểm tra tính hợp lệ
    if (req.body.items) {
      const newItems = req.body.items;

      // 1. Kiểm tra xem có xóa mất item nào đã được xác nhận không
      for (const oldItem of existingOrder.items) {
        if (oldItem.warehouseConfirm?.value) {
          const stillExists = newItems.find(
            (it) => it._id && it._id.toString() === oldItem._id.toString(),
          );
          if (!stillExists) {
            return res.status(400).json({
              message: `Không thể xóa hàng hóa "${oldItem.productName}" đã được kho xác nhận`,
            });
          }
        }
      }

      // 2. Kiểm tra xem có đổi kho của item đã xác nhận không
      for (const newItem of newItems) {
        if (newItem._id) {
          const oldItem = existingOrder.items.find(
            (it) => it._id.toString() === newItem._id.toString(),
          );
          if (oldItem && oldItem.warehouseConfirm?.value) {
            if (newItem.warehouse !== oldItem.warehouse) {
              return res.status(400).json({
                message: `Không thể đổi kho cho hàng hóa "${oldItem.productName}" đã được xác nhận`,
              });
            }
          }
        }
      }
    }

    // Cập nhật từng field để validator có context this đúng
    if (req.body.customer) {
      existingOrder.customer = req.body.customer;

      // Kiểm tra lại giới hạn công nợ nếu thay đổi khách hàng
      if (req.body.customer.customerCode) {
        const Customer = mongoose.model("Customer");
        const customer = await Customer.findOne({
          customerCode: req.body.customer.customerCode,
        });

        if (
          customer &&
          customer.currentDebt > customer.debtLimit &&
          !customer.bypassDebtCheck
        ) {
          existingOrder.isOverDebtLimit = true;
        } else {
          existingOrder.isOverDebtLimit = false;
        }
      }
    }
    if (req.body.items) existingOrder.items = req.body.items;
    if (req.body.orderDate) existingOrder.orderDate = req.body.orderDate;
    if (req.body.vehicle !== undefined)
      existingOrder.vehicle = req.body.vehicle;

    // Save để trigger validator với context đúng
    await existingOrder.save();
    await existingOrder.populate("vehicle");

    res.status(200).json(existingOrder);
  } catch (error) {
    res.status(400).json({
      message: "Cập nhật đơn hàng thất bại",
      error: error.message,
    });
  }
};

// DELETE - Xóa đơn hàng
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Kiểm tra xem có item nào đã xác nhận chưa
    const hasConfirmedItem = order.items.some(
      (item) => item.warehouseConfirm?.value,
    );
    if (hasConfirmedItem) {
      return res.status(400).json({
        message: "Không thể xóa đơn hàng đã có hàng hóa được kho xác nhận",
      });
    }

    await Order.findByIdAndDelete(id);

    res.status(200).json({
      message: "Xóa đơn hàng thành công",
      deletedOrder: order,
    });
  } catch (error) {
    res.status(500).json({
      message: "Xóa đơn hàng thất bại",
      error: error.message,
    });
  }
};

// ASSIGN TO VEHICLE - Gán đơn hàng vào xe hoặc bỏ gán (vehicleId = null)
export const assignToVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicleId } = req.body;

    // Nếu đang gán xe (không phải bỏ gán), kiểm tra giới hạn công nợ
    if (vehicleId !== null && vehicleId !== undefined) {
      const order = await Order.findById(id);

      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      if (order.isOverDebtLimit) {
        // Check if customer has bypass enabled
        const Customer = mongoose.model("Customer");
        const customer = await Customer.findOne({
          customerCode: order.customer.customerCode,
        });

        if (!customer?.bypassDebtCheck) {
          return res.status(400).json({
            message: "Không thể gán xe cho đơn hàng vượt hạn mức công nợ",
            error: "Khách hàng đã vượt quá giới hạn nợ cho phép",
          });
        }
      }
    }

    // Cho phép vehicleId = null để bỏ gán
    const updateData =
      vehicleId === null || vehicleId === undefined
        ? { vehicle: null }
        : { vehicle: vehicleId };

    const order = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("vehicle");

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({
      message:
        vehicleId === null || vehicleId === undefined
          ? "Bỏ gán xe thất bại"
          : "Gán xe thất bại",
      error: error.message,
    });
  }
};

// CONFIRM WAREHOUSE - Thủ kho xác nhận (sẽ dùng sau)
export const confirmWarehouse = async (req, res) => {
  try {
    const { orderId, itemIndex } = req.params;
    const { value } = req.body; // Giá trị xác nhận (số lượng hoặc giờ hẹn)

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (!order.items[itemIndex]) {
      return res.status(404).json({ message: "Không tìm thấy item" });
    }

    // Check quyền: chỉ user có warehouseCode trùng khớp hoặc admin mới được xác nhận
    if (
      req.user.role === "warehouse" &&
      req.user.warehouseCode !== order.items[itemIndex].warehouse
    ) {
      return res.status(403).json({
        message: "Bạn không có quyền xác nhận hàng của kho này",
      });
    }

    // Cập nhật xác nhận của thủ kho
    order.items[itemIndex].warehouseConfirm = {
      value: value,
      confirmedAt: new Date(),
    };

    await order.save();

    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({
      message: "Xác nhận thủ kho thất bại",
      error: error.message,
    });
  }
};

// CONFIRM LEADER - Tổ trưởng xác nhận (sẽ dùng sau)
export const confirmLeader = async (req, res) => {
  try {
    const { orderId, itemIndex } = req.params;
    const { value } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (!order.items[itemIndex]) {
      return res.status(404).json({ message: "Không tìm thấy item" });
    }

    const item = order.items[itemIndex];

    // Cập nhật xác nhận của tổ trưởng
    item.leaderConfirm = {
      value: value,
      confirmedAt: new Date(),
    };

    // Tự động tính shortageQty = max(quantity - leaderConfirm, 0)
    const shortage = Math.max(item.quantity - value, 0);
    item.shortageQty = shortage;

    // Nếu không có thiếu → CLOSED
    if (shortage === 0) {
      item.shortageStatus = "CLOSED";
    }
    // Nếu có thiếu nhưng đã bù đủ → CLOSED
    else if (item.compensatedQty >= shortage) {
      item.shortageStatus = "CLOSED";
    }
    // Nếu có thiếu và chưa bù đủ → OPEN (trừ khi đã IGNORED)
    else if (item.shortageStatus !== "IGNORED") {
      item.shortageStatus = "OPEN";
    }

    await order.save();

    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({
      message: "Xác nhận tổ trưởng thất bại",
      error: error.message,
    });
  }
};

// CONFIRM ALL DETAILS - Xác nhận tất cả hàng hóa trong 1 đơn (Cho điều vận)
export const confirmOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // Mảng items đã update warehouseConfirm và leaderConfirm

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Cập nhật từng item
    items.forEach((updatedItem) => {
      const itemIndex = order.items.findIndex(
        (it) => it._id.toString() === updatedItem._id.toString(),
      );
      if (itemIndex !== -1) {
        const item = order.items[itemIndex];

        // Cập nhật warehouseConfirm nếu có thay đổi
        if (updatedItem.warehouseConfirm !== undefined) {
          item.warehouseConfirm = {
            value: updatedItem.warehouseConfirm.value,
            confirmedAt: new Date(),
          };
        }

        // Cập nhật leaderConfirm nếu có thay đổi
        if (updatedItem.leaderConfirm !== undefined) {
          item.leaderConfirm = {
            value: updatedItem.leaderConfirm.value,
            confirmedAt: new Date(),
          };

          // Tự động tính shortageQty = max(quantity - leaderConfirm, 0)
          const shortage = Math.max(
            item.quantity - updatedItem.leaderConfirm.value,
            0,
          );
          item.shortageQty = shortage;

          // Cập nhật shortageStatus
          if (shortage === 0) {
            item.shortageStatus = "CLOSED";
          } else if (item.compensatedQty >= shortage) {
            item.shortageStatus = "CLOSED";
          } else if (item.shortageStatus !== "IGNORED") {
            item.shortageStatus = "OPEN";
          }
        }
      }
    });

    await order.save();

    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({
      message: "Xác nhận chi tiết đơn hàng thất bại",
      error: error.message,
    });
  }
};

// GET SURPLUS/DEFICIT DATA - Lấy dữ liệu hàng thừa thiếu
export const getSurplusDeficitData = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      creator,
      warehouse,
      customerName,
      status = "deficit", // "deficit" (thừa thiếu), "all" (tất cả)
    } = req.query;

    const filter = {};

    // Filter theo ngày
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

    // Filter theo người tạo (role bán hàng)
    if (creator) {
      filter.createdBy = creator;
    }

    // Filter theo tên khách hàng (case-insensitive)
    if (customerName && customerName.trim()) {
      filter["customer.name"] = {
        $regex: customerName.trim(),
        $options: "i",
      };
    }

    // Lấy tất cả đơn hàng theo filter
    const orders = await Order.find(filter)
      .populate("vehicle")
      .populate("createdBy", "name username")
      .sort({ orderDate: -1, createdAt: -1 });

    // Xử lý dữ liệu để tính toán thừa thiếu
    const processedData = [];

    orders.forEach((order) => {
      order.items.forEach((item) => {
        // Filter theo kho nếu có
        if (warehouse && item.warehouse !== warehouse) {
          return;
        }

        // Chỉ tính những item đã có leaderConfirm
        if (item.leaderConfirm?.value !== undefined) {
          const deficit = item.leaderConfirm.value - item.quantity;

          // Filter theo status
          if (status === "deficit" && deficit === 0) {
            return; // Bỏ qua những item không có thừa thiếu
          }

          processedData.push({
            orderId: order._id,
            orderDate: order.orderDate,
            customer: order.customer,
            vehicle: order.vehicle,
            createdBy: order.createdBy,
            itemId: item._id,
            stt: item.stt,
            productName: item.productName,
            size: item.size,
            unit: item.unit,
            quantity: item.quantity,
            warehouse: item.warehouse,
            leaderConfirm: item.leaderConfirm.value,
            deficit: deficit, // Số lượng thừa thiếu (dương = thừa, âm = thiếu)
            warehouseConfirm: item.warehouseConfirm?.value || "",
            note: item.note,
          });
        }
      });
    });

    res.status(200).json({
      data: processedData,
      total: processedData.length,
    });
  } catch (error) {
    res.status(500).json({
      message: "Lấy dữ liệu hàng thừa thiếu thất bại",
      error: error.message,
    });
  }
};
