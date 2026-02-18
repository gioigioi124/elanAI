import Vehicle from "../models/Vehicle.js";
import Order from "../models/Order.js";
import mongoose from "mongoose";

//thêm dữ liệu
export const createVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create({
      ...req.body,
      createdBy: req.user._id, // Gán người tạo từ token
    });
    const populatedVehicle = await Vehicle.findById(vehicle._id).populate(
      "createdBy",
      "name username",
    );

    // Emit real-time event cho tất cả clients
    const io = req.app.get("io");
    io.emit("new-vehicle", populatedVehicle);

    res.status(201).json(populatedVehicle);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi thêm xe" });
  }
};

//lấy tất cả dữ liệu
export const getAllVehicles = async (req, res) => {
  try {
    const { fromDate, toDate, creator, page = 1, limit = 10 } = req.query;
    const matchStage = {};

    // Filter theo người tạo
    if (creator) {
      matchStage.createdBy = new mongoose.Types.ObjectId(creator);
    }

    // Filter theo khoảng ngày (vehicleDate)
    if (fromDate || toDate) {
      matchStage.vehicleDate = {};
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0); // Start of day
        matchStage.vehicleDate.$gte = from;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999); // End of day
        matchStage.vehicleDate.$lte = to;
      }
    }

    // Tính toán pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Đếm tổng số xe
    const totalVehicles = await Vehicle.countDocuments(matchStage);
    const totalPages = Math.ceil(totalVehicles / limitNum);

    // Sử dụng aggregation để lấy xe kèm theo số lượng đơn hàng trong 1 query duy nhất
    const vehicles = await Vehicle.aggregate([
      { $match: matchStage },
      {
        $sort: {
          vehicleDate: -1,
          createdAt: -1,
        },
      },
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: "orders", // Collection name trong MongoDB
          localField: "_id",
          foreignField: "vehicle",
          as: "orders",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByUser",
        },
      },
      {
        $addFields: {
          orderCount: { $size: "$orders" },
          createdBy: {
            $cond: {
              if: { $gt: [{ $size: "$createdByUser" }, 0] },
              then: {
                _id: { $arrayElemAt: ["$createdByUser._id", 0] },
                name: { $arrayElemAt: ["$createdByUser.name", 0] },
                username: { $arrayElemAt: ["$createdByUser.username", 0] },
              },
              else: null,
            },
          },
        },
      },
      {
        $project: {
          orders: 0,
          createdByUser: 0,
        },
      },
    ]);

    // Trả về dữ liệu với metadata
    res.status(200).json({
      vehicles,
      currentPage: pageNum,
      totalPages,
      totalVehicles,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy thông tin toàn bộ xe" });
  }
};

//lấy dữ liệu một xe
export const getVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    res.status(200).json(vehicle);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy thông tin  xe" });
  }
};

//update dữ liệu
export const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Không có xe này" });

    // Kiểm tra nếu đang cố gắng thay đổi ngày xe
    if (req.body.vehicleDate) {
      // So sánh chỉ phần ngày (YYYY-MM-DD), bỏ qua phần giờ
      const currentDate = vehicle.vehicleDate.toISOString().split("T")[0];
      const newDate = req.body.vehicleDate.split("T")[0];

      if (currentDate !== newDate) {
        // Kiểm tra xem có đơn hàng nào đang gán vào xe không
        const ordersWithVehicle = await Order.countDocuments({
          vehicle: req.params.id,
        });

        if (ordersWithVehicle > 0) {
          return res.status(400).json({
            message: `Không thể thay đổi ngày xe. Có ${ordersWithVehicle} đơn hàng đang được gán vào xe này. Vui lòng bỏ gán các đơn hàng trước khi thay đổi ngày xe.`,
          });
        }
      }
    }

    // Chỉ cập nhật nếu dữ liệu được gửi lên
    if (req.body.carName) vehicle.carName = req.body.carName;
    if (req.body.time) vehicle.time = req.body.time;
    if (req.body.weight) vehicle.weight = req.body.weight;
    if (req.body.destination) vehicle.destination = req.body.destination;
    if (req.body.note !== undefined) vehicle.note = req.body.note;
    if (req.body.vehicleDate) {
      vehicle.vehicleDate = req.body.vehicleDate;
    }
    if (req.body.isPrinted !== undefined) {
      vehicle.isPrinted = req.body.isPrinted;
    }
    if (req.body.isCompleted !== undefined) {
      vehicle.isCompleted = req.body.isCompleted;
    }

    await vehicle.save();
    await vehicle.populate("createdBy", "name username");
    res.status(200).json(vehicle);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật thông tin xe" });
  }
};

//xóa dữ liệu
export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra xem có đơn hàng nào đang gán vào xe không
    const ordersWithVehicle = await Order.countDocuments({ vehicle: id });

    if (ordersWithVehicle > 0) {
      return res.status(400).json({
        message: `Không thể xóa xe. Có ${ordersWithVehicle} đơn hàng đang được gán vào xe này. Vui lòng bỏ gán các đơn hàng trước khi xóa xe.`,
      });
    }

    const vehicle = await Vehicle.findByIdAndDelete(id);
    if (!vehicle) {
      return res.status(404).json({ message: "Không có xe này" });
    }

    // Emit real-time event cho tất cả clients
    const io = req.app.get("io");
    io.emit("delete-vehicle", { vehicleId: id });

    res.status(200).json({ message: "Xóa xe thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa xe" });
  }
};
