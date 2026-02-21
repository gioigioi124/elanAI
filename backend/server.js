import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./src/config/db.js";
import ordersRouter from "./src/routers/ordersRouter.js";
import vehiclesRouter from "./src/routers/vehiclesRouter.js";
import authRouter from "./src/routers/authRouter.js";
import userRouter from "./src/routers/userRouter.js";
import customerRouter from "./src/routers/customerRouter.js";
import shortageRouter from "./src/routers/shortageRouter.js";
import chatbotRouter from "./src/routers/chatbotRouter.js";
import conversationRouter from "./src/routers/conversationRouter.js";
import cors from "cors";

//gọi dotenv
dotenv.config();
const PORT = process.env.PORT || 3000;

//tạo app sử dụng express
const app = express();
const server = http.createServer(app);

//middleware đọc Json từ request body
app.use(express.json());

// CORS configuration for production
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Lưu io vào app để controller sử dụng
app.set("io", io);

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    // disconnected handle
  });
});

//rút gọn URL nhờ router
app.use("/orders", ordersRouter);
app.use("/vehicles", vehiclesRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/customers", customerRouter);
app.use("/api/shortages", shortageRouter);
app.use("/api/chatbot", chatbotRouter);
app.use("/api/conversations", conversationRouter);

// connect DB
connectDB().then(() => {
  //  tạo lắng nghe trên cổng 3000
  server.listen(PORT, () => {
    console.log(`server bắt đầu trên cổng ${PORT}`);
  });
});
