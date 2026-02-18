import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";
import { connectDB } from "./src/config/db.js";

dotenv.config();

connectDB();

const importData = async () => {
  try {
    await User.deleteMany();

    const users = [
      {
        username: "admin",
        password: "123", // Password will be hashed by pre-save hook in User model
        name: "Admin User",
        role: "admin",
      },
      {
        username: "staff1",
        password: "123",
        name: "Staff User 1",
        role: "staff",
      },
    ];

    // Sử dụng vòng lặp để create từng user, kích hoạt pre-save hook để mã hóa mật khẩu
    for (const user of users) {
      await User.create(user);
    }

    console.log("Data Imported!");
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

importData();
