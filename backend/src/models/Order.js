import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    // Thông tin khách hàng
    customer: {
      name: {
        type: String,
        required: [true, "Tên khách hàng là bắt buộc"],
        trim: true,
      },
      customerCode: {
        type: String,
        trim: true,
        default: "",
      },
      address: {
        type: String,
        trim: true,
        default: "",
      },
      phone: {
        type: String,
        trim: true,
        default: "",
      },
      note: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Danh sách hàng hóa trong đơn
    items: [
      {
        stt: {
          type: Number,
          required: true,
        },
        productName: {
          type: String,
          required: [true, "Tên hàng hóa là bắt buộc"],
          trim: true,
        },
        size: {
          type: String,
          trim: true,
        },
        unit: {
          type: String,
          required: [true, "Đơn vị tính là bắt buộc"],
          trim: true,
        },
        quantity: {
          type: Number,
          required: [true, "Số lượng là bắt buộc"],
          min: [0, "Số lượng không thể âm"],
        },
        warehouse: {
          type: String,
          required: [true, "Kho là bắt buộc"],
          enum: {
            values: ["K01", "K02", "K03", "K04"],
            message: "Kho phải là một trong: K01, K02, K03, K04",
          },
        },
        cmQty: {
          type: Number,
          min: [0, "Số cm hàng không thể âm"],
          default: 0,
        },
        cmQtyPerUnit: {
          type: Number,
          min: [0, "Số cm cho 1 đơn vị không thể âm"],
          default: 0,
        },
        note: {
          type: String,
          trim: true,
          default: "",
        },
        // Xác nhận của thủ kho (linh hoạt: có thể là số lượng hoặc giờ hẹn)
        warehouseConfirm: {
          value: {
            type: String, // Linh hoạt: "10", "16h", "15:30", v.v.
            trim: true,
          },
          confirmedAt: {
            type: Date,
          },
        },
        // Xác nhận của tổ trưởng (số giao thực tế)
        leaderConfirm: {
          value: {
            type: Number, // Số lượng thực tế lên xe (chỉ chấp nhận số)
            min: [0, "Số lượng xác nhận không thể âm"],
          },
          confirmedAt: {
            type: Date,
          },
        },

        // === QUẢN LÝ THIẾU HÀNG ===
        // Số lượng thiếu = max(quantity - leaderConfirm.value, 0)
        shortageQty: {
          type: Number,
          min: [0, "Số lượng thiếu không thể âm"],
          default: 0,
        },
        // Số lượng đã bù
        compensatedQty: {
          type: Number,
          min: [0, "Số lượng đã bù không thể âm"],
          default: 0,
        },
        // Trạng thái thiếu hàng
        shortageStatus: {
          type: String,
          enum: {
            values: ["OPEN", "CLOSED", "IGNORED"],
            message: "Trạng thái thiếu phải là: OPEN, CLOSED, hoặc IGNORED",
          },
          default: "OPEN",
        },

        // === CHO ĐỚN BÙ ===
        // Trỏ về item gốc bị thiếu (chỉ dùng cho đơn bù)
        sourceItemId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        // Trỏ về order gốc bị thiếu (chỉ dùng cho đơn bù)
        sourceOrderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
          default: null,
        },
      },
    ],

    // Đánh dấu đơn bù
    isCompensationOrder: {
      type: Boolean,
      default: false,
    },

    // Đánh dấu đơn vượt hạn mức công nợ
    isOverDebtLimit: {
      type: Boolean,
      default: false,
    },

    // Ngày đơn hàng (cho phép hôm nay hoặc tương lai khi tạo mới, cho phép giữ nguyên ngày cũ khi update)
    orderDate: {
      type: Date,
      required: [true, "Ngày đơn hàng là bắt buộc"],
      validate: {
        validator: function (value) {
          // Chỉ validate khi tạo mới hoặc khi thay đổi ngày
          if (!this.isNew && !this.isModified("orderDate")) {
            return true; // Bỏ qua validation nếu không thay đổi ngày
          }

          // Chỉ cho phép ngày hôm nay hoặc tương lai khi tạo mới hoặc thay đổi ngày
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const orderDate = new Date(value);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate >= today;
        },
        message: "Ngày đơn hàng không được là ngày trong quá khứ",
      },
      default: Date.now,
    },

    // Thông tin xe (ban đầu chưa có)
    vehicle: {
      type: mongoose.Schema.Types.ObjectId, //tham chiếu đến schema của vehicle
      ref: "Vehicle",
      default: null,
    },
    // Người tạo đơn hàng
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// sau khi có schema thì sẽ tạo model từ nó
// mongo sẽ tự hiểu, model Order thì colection sẽ là Orders
const Order = mongoose.model("Order", orderSchema);

export default Order;
