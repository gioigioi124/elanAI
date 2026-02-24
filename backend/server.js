import express from "express";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./src/config/db.js";
import authRouter from "./src/routers/authRouter.js";
import userRouter from "./src/routers/userRouter.js";
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
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/chatbot", chatbotRouter);
app.use("/api/conversations", conversationRouter);

// connect DB
connectDB().then(() => {
  //  tạo lắng nghe trên cổng 3000
  server.listen(PORT, () => {
    console.log(`server bắt đầu trên cổng ${PORT}`);
    // Warmup connections to eliminate cold start on first request
    warmup();
  });
});

// Graceful shutdown: release port immediately when nodemon restarts
const gracefulShutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000);
};
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.once("SIGUSR2", () => {
  server.close(() => process.kill(process.pid, "SIGUSR2"));
});

// Pre-establish connections to Gemini API + Supabase so first user request is fast
async function warmup() {
  try {
    const { genAI } = await import("./src/config/ai.js");
    const { supabase } = await import("./src/config/supabase.js");

    await Promise.allSettled([
      genAI.getGenerativeModel({ model: "models/gemini-embedding-001" })
        .embedContent({
          content: { parts: [{ text: "warmup" }] },
          taskType: "RETRIEVAL_QUERY",
          outputDimensionality: 768,
        }),
      supabase.from("documents").select("id").limit(1),
      genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" })
        .generateContent("hi"),
    ]);
  } catch (err) {
    // Warmup failure is non-critical
  }
}
