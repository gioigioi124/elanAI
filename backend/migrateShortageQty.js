import mongoose from "mongoose";
import dotenv from "dotenv";
import Order from "./src/models/Order.js";

dotenv.config();

/**
 * Migration script để cập nhật shortageQty cho các order cũ
 * Chạy: node migrateShortageQty.js
 */
async function migrateShortageQty() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Tìm tất cả orders không phải đơn bù
    const orders = await Order.find({ isCompensationOrder: false });
    console.log(`📦 Found ${orders.length} orders to process`);

    let updatedCount = 0;
    let itemsUpdated = 0;

    for (const order of orders) {
      let orderModified = false;

      for (const item of order.items) {
        // Chỉ xử lý item có leaderConfirm
        if (item.leaderConfirm && item.leaderConfirm.value !== undefined) {
          const leaderConfirmValue = item.leaderConfirm.value;
          const quantity = item.quantity;

          // Tính shortageQty
          const correctShortageQty = Math.max(quantity - leaderConfirmValue, 0);

          // Nếu shortageQty hiện tại khác với giá trị đúng
          if (item.shortageQty !== correctShortageQty) {
            console.log(
              `  📝 Order ${order._id}, Item "${item.productName}": ` +
                `shortageQty ${item.shortageQty} → ${correctShortageQty}`,
            );

            item.shortageQty = correctShortageQty;
            orderModified = true;
            itemsUpdated++;

            // Cập nhật status
            if (correctShortageQty === 0) {
              item.shortageStatus = "CLOSED";
            } else if (item.compensatedQty >= correctShortageQty) {
              item.shortageStatus = "CLOSED";
            } else if (item.shortageStatus !== "IGNORED") {
              item.shortageStatus = "OPEN";
            }
          }
        }
      }

      if (orderModified) {
        await order.save();
        updatedCount++;
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   - Orders updated: ${updatedCount}`);
    console.log(`   - Items updated: ${itemsUpdated}`);

    await mongoose.connection.close();
    console.log("👋 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateShortageQty();
