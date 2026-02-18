## BASIC EXPRESS

- import express
- tạo app sử dụng express, tạo cổng
- lấy dữ liệu từ server bằng get
- tạo lắng nghe trên cổng

## CRUD API với data giả

## Tách logic sang controller để dễ quản lý

## Tách các router, URL sang thư mục router để quản lý

## Cài Mongoose, tạo db.js để connect với mongoose qua hàm async await

- lưu ý, thư mục .env phải cùng cấp với sever.js để phục vụ dotevn.config()

## Tạo schema cho ORDER và VEHICLE

## Chỉnh sửa controllers

## Phân tách controller và router của xe và order

## 19/12/2025 OMG test gửi dữ liệu tạo xe thành công nhờ THUNDER

## 21/12/2025 Test thành công CRUD của xe qua Thunder

## Tạo ứng dụng react và vite, sử dụng thêm react-router axios sonner lucide-react

## Cài đặt shadcn, jsconfig.json, tạo file chứa layout chính và component cho Vehicles

## Tạo thư mục services và api.js để rút gọn URL cho API

## Tạo logic cho api của Vehicles

## 22/12/2025 Test thành công Vehicle lên frontend

## 23/12/2025 Tạo layout chung cho trang chủ, thêm các nút Tạo đơn hàng, Tạo xe, Danh sách đơn hàng

<!-- prettier-ignore -->
```
┌──────────────────────────────────────────────────────┐
│  Header: [Create Order] [Create Tranpo] [OrderList]  │
├──────────┬─────────────────┬─────────────────────────┤
│          │                 │                         │
│ Vehicle  │  Orders in      │  Order Detail           │
│ List     │  Vehicle        │  (Chi tiết + Form)      │
│          │                 │                         │
│ Tranpo 1 │  Customer 1     │  Khách hàng: ...        │
│ Tranpo 2 │  Customer 2     │  Items table            │
│ Tranpo 3 │  Customer 3     │  [Buttons]              │
│          │                 │                         │
└──────────┴─────────────────┴─────────────────────────┘
```

## 23/12/2025 [CREATE TRANPO] Tạo xe thành công bằng dialog nhưng trang chủ chưa tự cập nhật xe

## 23/12/2025 [UPDATE DELETE] Sửa xóa xe thành công qua dialog

## 25/12/2025 Tạo phần backend và API cho Order, test thành công qua Thunder1
