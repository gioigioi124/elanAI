import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "./src/config/db.js";
import User from "./src/models/User.js";

dotenv.config();

const seedAnotherAdmin = async () => {
  try {
    await connectDB();

    const username = "admin_new";
    const password = "admin_password_2024";

    const adminExists = await User.findOne({ username });

    if (adminExists) {
      console.log(`Admin user '${username}' already exists`);
      process.exit();
    }

    const adminUser = await User.create({
      username,
      password,
      name: "Super Admin",
      role: "admin",
    });

    console.log(`Admin user '${username}' created successfully`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);

    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedAnotherAdmin();
