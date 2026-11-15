# Cấu hình project hiện tại

- Supabase project: `yitolptsdnjxehzbwass`
- Frontend chính: `https://namdtfu.github.io/ai-studylab/`
- Bản Sites hiện có: `https://ai-studylab-gachon-1115.tranthuy141198.chatgpt.site/`
- Public frontend config: `src/lib/public-project.ts`
- Không lưu khóa quản trị hoặc mật khẩu trong dự án.

## Backend đã cấu hình

Đã áp dụng sáu migration, triển khai ba Edge Function, đặt Site URL/redirect production và xác minh luồng trình duyệt bằng tài khoản thật. Các bước dưới đây mô tả cách tái tạo cấu hình trên project khác.

1. Mở `https://supabase.com/dashboard/project/yitolptsdnjxehzbwass` và đăng nhập bằng tài khoản sở hữu project.
2. Áp dụng các file trong `supabase/migrations/` theo thứ tự. Có thể dùng CLI theo README hoặc chạy bản SQL tổng hợp trong SQL Editor.
3. Triển khai `import-lesson`, `grade-quiz`, `edit-lesson` và giữ xác thực `auth.getUser` bên trong các function.
4. Authentication → URL Configuration:
   - Site URL: `https://namdtfu.github.io/ai-studylab/`
   - Redirect URLs: URL GitHub Pages ở trên và URL Sites hiện có.
   - Local redirect (nếu dùng): `http://127.0.0.1:5173/`.
   - Giữ xác nhận email bật. Không có hash route trong callback.
5. Người dùng đăng ký/xác nhận email/đăng nhập ứng dụng; kiểm tra nhập mẫu, nộp bài, làm lại và lịch sử.

Publishable key chỉ kết nối frontend và không có quyền tạo bảng, thay đổi Auth settings hoặc deploy Edge Functions. Không gửi secret/service-role key vào chat để làm các bước này.

## CLI với project đã bootstrap bằng SQL Editor

SQL Editor không tự ghi lịch sử migration của CLI. Sau khi xác nhận sáu migration đã được áp dụng thành công, đánh dấu chúng đã áp dụng trước khi chạy db push lần đầu:

```sh
supabase link --project-ref yitolptsdnjxehzbwass
supabase migration repair --status applied 202611150001 202611150002 202611150003 202611150004 202611150005 202611150006
supabase migration list
```

Không chạy lại bootstrap trên project đã có bảng. Dùng migration mới cho các thay đổi tiếp theo.

## GitHub Pages của repository này

- Repository: https://github.com/namdtfu/ai-studylab
- Website: https://namdtfu.github.io/ai-studylab/
- Source: GitHub Actions, workflow `.github/workflows/deploy.yml`, nhánh `main`.
- Repository variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BASE_PATH=/ai-studylab/`.
- Mỗi lần push `main`, workflow kiểm tra schema, chạy 58 tests, TypeScript build và deploy frontend.
- Backend và dữ liệu Supabase dùng lại project hiện tại; không chạy lại bootstrap.
- Không có service-role key, database password hay token GitHub trong mã nguồn/biến frontend.

## Danh sách riêng theo tài khoản

Migration 006 đặt curriculum mặc định trống và thêm curriculum_initialized. Danh sách cũ đã tùy chỉnh được giữ nguyên; mẫu mặc định cũ được giữ trong database nhưng không hiển thị cho tới khi người dùng tự thiết lập. Lưu danh sách cập nhật cả curriculum và cờ khởi tạo trong một request, theo RLS của profile sở hữu. Không sửa lại migration 005 đã áp dụng; script curriculum:schema hiện sinh migration 006.
