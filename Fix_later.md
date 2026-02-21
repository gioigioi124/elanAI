# CỘT 1

- Click và hover vào xe cho sang thẻ div bên ngoài✅
- Full màn hình với max-w✅
- Thêm nút tick chọn để xác nhận là xe đã in đơn, và cạnh nút sửa xóa là nút xác nhận đã hoàn thiện đơn hàng ✅
- dialog xác nhận hoàn thành và in đơn hàng✅

# CỘT 2

- Đơn gán vào xe phải cùng ngày với xe ✅
- click đổi xe thì đơn hàng sẽ được set về null ✅
- thêm nút in số lượng cho điều vận ✅
- export file ✅

# CỘT 3

- rút gọn UI ✅

# PRINT PREVIEW

- Rút gọn UI, Header Table✅
- Full màn hình khi print ✅

# TỐI ƯU

- xóa react print
- console.log linh tinh

- sắp xếp hàng hóa trước khi lưu lại ✅
- sắp xếp đơn hàng trong xe theo tên KH ✅
- validation khách hàng (ép chọn) ✅
- chọn nhiều đơn để gán xe một lúc ✅

- thêm nút in đơn ✅, export file cạnh sửa xóa ✅
- phân trang✅
- dialog in đơn, hoàn thành đơn ✅
- thêm dòng mặc định số lượng là 1 ✅
- hotkey thêm dòng ✅
- Tạo nút đổi xe ✅

# DASHBOARD

- Đếm số lượng xe ngày hôm đó✅
- Leader confirm lại số lượng thì số cm được update
- khi thêm hàng thừa thiếu thì dòng đó tạm thời biến mất

# HÀNG CHƯA ĐI CỦA STAFF ✅

# BUG FIX DROPDOWN

📝 Tổng kết giải pháp:
Vấn đề ban đầu: Dropdown bị khuất bởi overflow-x-auto của table container

Giải pháp cuối cùng (KHÔNG dùng React Portal):
Thay đổi overflow-x-auto → overflow-visible trong file
table.jsx
(ShadCN UI component)
Thêm min-h-[250px] cho wrapper của ItemsTable trong
OrderEditDialog.jsx
Giữ nguyên ProductAutocomplete với absolute positioning đơn giản

Các phần NÊN có Real-time (Ưu tiên cao)
Tính năng Lý do Mô tả
🚚 WarehouseDashboard Nhiều nhân viên kho cùng làm việc Khi 1 người xác nhận đơn → tất cả thấy ngay
📋 DispatcherDashboard Dispatcher cần thấy đơn mới ngay Đơn mới từ sales → hiện ngay cho dispatcher
📦 OrderList/OrderDetail Tránh xung đột khi nhiều người sửa Đơn đang được ai đó sửa → thông báo
🚛 VehicleOrderList Cập nhật tình trạng xe Xe được gán đơn → hiển thị realtime

---

# 🔧 LỖI CHATBOT KHI CHUYỂN TỪ RAILWAY SANG RENDER

**Ngày phát hiện:** 2026-02-06  
**Triệu chứng:** Chat widget trả về lỗi 500 Internal Server Error khi gửi tin nhắn

## 📋 Nguyên nhân gốc rễ

### 1. **Gemini API Model Đã Thay Đổi** ⚠️

- **Vấn đề chính:** Model embedding `text-embedding-004` đã bị deprecated và shutdown vào **14/01/2026**
- **Model mới:** `gemini-embedding-001` (thay thế chính thức)
- **Lỗi gặp phải:**
  ```
  [GoogleGenerativeAI Error]: models/text-embedding-004 is not found for API version v1beta
  ```

### 2. **Vector Dimension Không Khớp** 🔢

- **Model cũ** (`text-embedding-004`): 768 dimensions
- **Model mới** (`gemini-embedding-001`): 3072 dimensions (mặc định)
- **Pinecone Index:** Đã được tạo với 768 dimensions
- **Lỗi gặp phải:**
  ```
  Vector dimension 3072 does not match the dimension of the index 768
  ```

### 3. **Frontend Gọi API Không Đúng Cách** 🌐

- **Vấn đề:** `ChatWidget.jsx` gọi trực tiếp `axios` thay vì dùng `api` instance đã cấu hình
- **Hậu quả:** Không sử dụng `VITE_API_URL` từ environment variables
- **Ảnh hưởng:** Khi deploy lên Vercel/Render, URL backend không được cập nhật tự động

## ✅ Giải pháp đã áp dụng

### 1. **Cập nhật Model Embedding**

**File:** `backend/src/controllers/chatbotController.js`

```javascript
// ❌ CŨ (Không hoạt động)
const embeddingModel = genAI.getGenerativeModel({
  model: "models/text-embedding-004",
});

// ✅ MỚI (Hoạt động)
const embeddingModel = genAI.getGenerativeModel({
  model: "models/gemini-embedding-001",
});
```

**Vị trí cần sửa:**

- Dòng 48: Function `uploadKnowledgeBase`
- Dòng 105: Function `chat`

### 2. **Giảm Vector Dimension**

**File:** `backend/src/controllers/chatbotController.js`

```javascript
// Thêm outputDimensionality để khớp với Pinecone index (768)
const batchEmbeddings = await embeddingModel.batchEmbedContents({
  requests: chunk.map((doc) => ({
    content: { role: "user", parts: [{ text: doc.content }] },
    taskType: "RETRIEVAL_DOCUMENT",
    outputDimensionality: 768, // ✅ THÊM DÒNG NÀY
  })),
});

const embeddingResult = await embeddingModel.embedContent({
  content: { parts: [{ text: message }] },
  taskType: "RETRIEVAL_QUERY",
  outputDimensionality: 768, // ✅ THÊM DÒNG NÀY
});
```

**Vị trí cần sửa:**

- Dòng 57-62: Function `uploadKnowledgeBase` - batchEmbedContents
- Dòng 108-111: Function `chat` - embedContent

### 3. **Sửa Frontend API Call**

**File:** `frontend/src/components/chat/ChatWidget.jsx`

```javascript
// ❌ CŨ (Không dùng environment variable đúng cách)
import axios from "axios";
const response = await axios.post(
  `${import.meta.env.VITE_API_URL || ""}/api/chatbot/message`,
  { message: input, history: messages },
);

// ✅ MỚI (Dùng api instance đã cấu hình)
import api from "@/services/api";
const response = await api.post("/api/chatbot/message", {
  message: input,
  history: messages,
});
```

## 🚀 Checklist Deploy Production

### **Backend (Render)**

Đảm bảo các biến môi trường sau:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=chatbot
FRONTEND_URL=https://your-app.vercel.app
MONGO_URI=your_mongodb_connection_string
```

### **Frontend (Vercel)**

```env
VITE_API_URL=https://your-backend.onrender.com
```

### **Sau khi cập nhật:**

1. ✅ Redeploy backend trên Render
2. ✅ Redeploy frontend trên Vercel
3. ✅ Test chat widget trên production
4. ✅ Kiểm tra console không có lỗi

## 📚 Tài liệu tham khảo

- [Google Gemini Embedding Models](https://ai.google.dev/gemini-api/docs/models/gemini)
- Model `text-embedding-004` shutdown: 14/01/2026
- Model thay thế: `gemini-embedding-001`
- Hỗ trợ Matryoshka Representation Learning (MRL) - có thể scale dimension từ 3072 xuống 768

## 🔍 Cách debug tương tự trong tương lai

1. **Kiểm tra backend logs** trên Render Dashboard
2. **Test API trực tiếp** bằng curl/Postman:
   ```bash
   curl -X POST https://your-backend.onrender.com/api/chatbot/message \
     -H "Content-Type: application/json" \
     -d '{"message":"test"}'
   ```
3. **Kiểm tra browser console** để xem lỗi chi tiết
4. **Verify environment variables** trên cả Render và Vercel
5. **Đọc changelog** của các API third-party (Gemini, Pinecone, etc.)
