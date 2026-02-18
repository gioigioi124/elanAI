import mongoose from "mongoose";

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
  }
);

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return enteredPassword === this.password;
};

const User = mongoose.model("User", userSchema);
export default User;
