import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Vui lòng nhập tên đăng nhập"],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Vui lòng nhập mật khẩu"],
    },
    name: {
      type: String,
      required: [true, "Vui lòng nhập tên hiển thị"],
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "staff", "warehouse", "leader"],
      default: "staff",
    },
    warehouseCode: {
      type: String,
      enum: ["K01", "K02", "K03", "K04"],
      // Chỉ bắt buộc nếu role là warehouse, nhưng xử lý logic đó ở controller hoặc validation sau
    },
  },
  {
    timestamps: true,
  },
);

// Hash password trước khi lưu vào DB
userSchema.pre("save", async function () {
  // Chỉ hash nếu password bị thay đổi (hoặc là mới)
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// So sánh password nhập vào với hash trong DB
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
