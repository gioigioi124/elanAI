import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      required: [true, "Mã khách hàng là bắt buộc"],
      unique: true,
      trim: true,
      index: true, // Index for fast lookup
    },
    name: {
      type: String,
      required: [true, "Tên khách hàng là bắt buộc"],
      trim: true,
      index: true, // Index for search
    },
    address: {
      type: String,
      trim: true,
      default: "",
      index: true, // Index for search
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    // Quản lý công nợ
    debtLimit: {
      type: Number,
      default: 0,
      min: [0, "Giới hạn nợ không thể âm"],
    },
    currentDebt: {
      type: Number,
      default: 0,
      min: [0, "Công nợ không thể âm"],
    },
    // Bỏ qua kiểm tra công nợ khi tạo đơn/gán xe
    bypassDebtCheck: {
      type: Boolean,
      default: false,
    },
    // Người upload dữ liệu khách hàng
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search functionality
customerSchema.index({ name: "text" });

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
