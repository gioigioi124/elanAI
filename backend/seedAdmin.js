import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "./src/config/db.js";
import User from "./src/models/User.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const adminExists = await User.findOne({ username: "admin" });

    if (adminExists) {
      console.log("Admin user already exists");
      process.exit();
    }

    const adminUser = await User.create({
      username: "admin",
      password: "123",
      name: "Administrator",
      role: "admin",
    });

    console.log("Admin user created successfully");
    console.log("Username: admin");
    console.log("Password: 123");

    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
