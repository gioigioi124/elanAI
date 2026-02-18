# ✅ Checklist Deploy Frontend lên Vercel

## 1. Deploy trên Vercel

1. Truy cập: https://vercel.com
2. Đăng nhập bằng GitHub
3. Click **Add New** → **Project**
4. Import: `gioigioi124/backend-and-CRUD`
5. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: Vite (tự động detect)
6. **Environment Variables** - Thêm biến:

   ```
   VITE_API_URL = https://backend-and-crud-production.up.railway.app
   ```

   ⚠️ Chọn áp dụng cho: Production, Preview, Development

7. Click **Deploy**

## 2. Sau khi Deploy xong

Lấy URL Vercel (ví dụ: `https://your-app.vercel.app`)

## 3. Cập nhật Railway Backend

1. Vào Railway dashboard: https://railway.app
2. Chọn backend project
3. Tab **Variables**
4. Cập nhật hoặc thêm biến:

   ```
   FRONTEND_URL = https://your-app.vercel.app
   ```

   ⚠️ Thay `your-app.vercel.app` bằng URL thực tế từ Vercel
   ⚠️ KHÔNG có dấu `/` ở cuối

5. Railway sẽ tự động redeploy

## 4. Test

- Truy cập URL Vercel
- Login với tài khoản admin
- Test các chức năng

---

**Backend URL**: https://backend-and-crud-production.up.railway.app  
**Frontend URL**: (Sẽ có sau khi deploy Vercel)
