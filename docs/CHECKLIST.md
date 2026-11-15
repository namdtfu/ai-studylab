# Checklist sau khi kết nối Supabase thật

Các mục sau là hướng dẫn kiểm thử cần thực hiện trên project mục tiêu, không phải báo cáo đã chạy.

1. Tài khoản A đăng ký, nhận email xác nhận và xác nhận đúng URL gốc có repository subpath. Đăng nhập, tải lại, đăng xuất; URL học riêng chuyển về login. Thử mật khẩu sai và session hết hạn.
2. Gửi email quên mật khẩu. Mở liên kết cùng trình duyệt và trình duyệt khác; chuyển đúng trang mật khẩu mới, đổi thành công, đăng nhập lại. Thử liên kết đã hết hạn.
3. Đổi Hàn → Việt, sáng → tối; tải lại và đăng nhập thiết bị khác để kiểm tra profile preference. Nội dung Hàn không bị dịch.
4. Nhập mẫu Coulomb, kiểm tra 10 câu và lời giải, lưu, đánh dấu học xong; kiểm tra dashboard chỉ phản ánh dữ liệu thật. Nhập lại cùng JSON phải mở bài hiện có.
5. JSON lỗi cú pháp, 9/11 câu, lặp ID, thiếu D, thêm E, đáp án E, thiếu giải thích, sai thứ tự category phải bị từ chối.
6. Bắt đầu quiz, đổi đáp án, nhảy câu, tải lại; draft còn nguyên. Trong Network response của `lesson_versions` không có correctOption/explanation. Trang quiz không gọi `edit-lesson` hoặc tải ví dụ.
7. Nộp 2 câu đúng, 1 sai và để trống 7 câu: phải được 20 điểm. Gửi lại cùng submissionId và payload: trả cùng attemptId, chỉ một lượt. Cùng ID nhưng payload khác: lỗi.
8. Nộp payload có score=100, ID lạ, option E, version của bài khác hoặc JWT không hợp lệ: bị từ chối. Không có attempt bị ghi dở.
9. Làm lại toàn bộ đúng: 100 điểm; lịch sử giữ cả hai lượt. Sổ tay hiển thị câu sai và chưa trả lời từ snapshot.
10. Sửa bài, đổi tiêu đề/đáp án, lưu thành version mới. Kết quả cũ và lời giải cũ giữ nguyên. Tab đang làm version cũ được chấm theo version cũ.
11. Tài khoản B không thấy bài/attempt/profile của A. Dùng Supabase REST với JWT B để SELECT ID A phải trả rỗng hoặc lỗi; đọc schema private, gọi RPC trusted, INSERT/UPDATE attempts và UPDATE lessons trực tiếp đều bị từ chối.
12. Thử đổi `study_progress.user_id` hoặc lesson_id sang tài khoản khác: RLS/khóa ngoại từ chối. Không dựa vào UI.
13. Xóa mềm bài: biến mất khỏi thư viện, không nhận lượt mới; kết quả cũ vẫn xem được. Liên kết luyện lại bài đã xóa báo không tìm được, không mất lịch sử.
14. Kiểm tra mobile 390px, keyboard, focus dialog, radio, công thức dài, bảng và code. Không tràn ngang trang.
15. PDF dưới hạn có chữ → trích text ở browser; PDF quét/lỗi/quá hạn → thông báo. Không có request upload PDF đến Supabase.
16. GitHub Actions chạy tests/build, URL Pages có subpath tải đúng assets; mở trực tiếp `/#/history` và callback auth đều hoạt động.
