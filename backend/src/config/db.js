import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Liên kết CSDL thành công");
  } catch (error) {
    console.error("Lỗi khi kết nối CSDL: ", error);
    process.exit(1); // đóng cổng database khi gặp lỗi, 1 là đóng với trạng thái thất bại
  }
};
