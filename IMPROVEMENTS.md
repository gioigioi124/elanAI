# Kế Hoạch Cải Thiện Chatbot

Danh sách các tác vụ cần thực hiện nhằm nâng cấp hệ thống Chatbot cho dự án elanAI. Khi hoàn thành tác vụ nào, chúng sẽ được đánh dấu `[x]`.

## 1. Trải nghiệm tương tác cốt lõi (Core UX)

- [ ] **Hiệu ứng Streaming:** Chuyển đổi API trả lời từ REST thuần sang Server-Sent Events (SSE) để chữ hiện ra từng từ một.
- [ ] **Nút "Regenerate" & "Stop":** Thêm khả năng tạo lại câu trả lời cuối cùng và dừng khi AI đang sinh chữ.
- [x] **Quản lý Context Window / Lịch sử hội thoại:** Xử lý việc không gửi toàn bộ dữ liệu lịch sử lớn từ frontend (có thể Backend sẽ tự quản lý session history, hoặc dùng Sliding Window).

## 2. Các rủi ro logic tiềm ẩn trong Source Code

- [x] **Sửa lỗi Markdown do Regex (`formatNumbersInText`):** Chỉ format số hiển thị thông thường, tránh định dạng nhầm vào code block hay các đường link (URL) sinh ra từ Markdown.
- [x] **Logic phát hiện Table an toàn hơn:** Nâng cấp cách phân tích Markdown thành Excel, khắc phục điểm yếu của hàm `hasTable` hiện tại.
- [ ] **Rủi ro lưu dữ liệu (Data Loss):** Chuyển đổi để Backend là nguồn lưu/cập nhật cuối cùng tự động (khi nhận prompt và trả response) thay vì chờ React gọi hàm qua `setTimeout`.

## 3. Tối ưu UI / Tính năng mở rộng

- [x] **Nút Copy tin nhắn:** Bổ sung action sao chép đoạn chat hoặc code block ra Clipboard.
- [ ] **Auto-scroll khi Streaming:** Hàm cuộn màn hình sẽ bám theo từng đoạn chữ rớt xuống khi streaming, thay vì nhảy đột ngột.
- [x] **Gỡ bỏ `<AnnoyingFly />`:** Loại bỏ hoặc disable component này khi đưa vào sử dụng chuyên nghiệp.
