# AI StudyLab

Website: [namdtfu.github.io/ai-studylab](https://namdtfu.github.io/ai-studylab/) · [GitHub Actions](https://github.com/namdtfu/ai-studylab/actions)

Nền tảng học tập riêng tư, giao diện **한국어 / Tiếng Việt**, dành cho dự án môn **AI 중심세상**. AI tạo tài liệu bên ngoài; ứng dụng không tích hợp API AI, không cần khóa AI và không thực thi mã do AI tạo.

## Project Supabase đã liên kết

Frontend đã được cấu hình với project `yitolptsdnjxehzbwass` trong `src/lib/public-project.ts`. File chỉ chứa URL và publishable key công khai; biến `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` vẫn được ưu tiên nếu cần dùng project khác. Không đặt service-role key vào file này.

Cấu hình frontend không tự tạo database hoặc Edge Functions. Cấu hình cụ thể của project nằm trong `docs/PROJECT_SETUP.md`. Trạng thái backend xem `docs/VERIFICATION.md`; áp dụng migration và deploy Functions theo hướng dẫn bên dưới.

## Chạy tại máy

Yêu cầu **Node.js 22.12+** và npm.

```sh
npm ci
cp .env.example .env
# Điền URL và publishable/anon key của Supabase vào .env
npm run dev
```

Mở URL Vite in ra. Khi chưa cấu hình Supabase, ứng dụng hiển thị hướng dẫn kết nối và vô hiệu hóa đăng nhập; không giả lập đăng nhập hay số liệu. Không cần máy chủ Express.

```sh
npm run schema  # Xuất JSON Schema và SQL validator từ Zod
npm test        # React, schema, PostgreSQL/RLS, chấm điểm
npm run build   # TypeScript strict + Vite
npm run preview
```

## Tính năng

- Đăng ký, xác nhận email, đăng nhập, đăng xuất, khôi phục mật khẩu và phiên đăng nhập Supabase.
- Dashboard lấy dữ liệu thực; quản lý bài học theo môn/chương tự nhập, tìm kiếm, lọc, sửa và xóa mềm.
- Bộ tạo prompt đồng bộ schema; quy trình PDF với AI bên ngoài; tùy chọn trích văn bản PDF cục bộ (20 MB, 100 trang). PDF không được tự tải lên hay lưu.
- Nhập JSON tối đa 1 MB, lỗi có đường dẫn trường, xem trước đầy đủ đáp án trước khi lưu; hai mẫu tiếng Hàn.
- Markdown an toàn, KaTeX, bảng, mã nguồn, mục tiêu, lý thuyết, ví dụ, lỗi thường gặp và tóm tắt.
- 10 câu / bài: 5 lý thuyết rồi 5 vận dụng, mỗi câu 4 lựa chọn. Không hẹn giờ. Thay đổi đáp án, điều hướng, cảnh báo câu trống, xác nhận nộp.
- Bản nháp theo người dùng và phiên bản bài học; điểm chính thức do Edge Function/PostgreSQL chấm.
- Nộp có khóa idempotency; mỗi lượt mới là một bản ghi riêng. Lịch sử và đáp án được chụp bất biến.
- Sổ tay câu sai, lọc môn/bài và luyện lại bài gốc. Giao diện sáng/tối và tùy chọn ngôn ngữ theo tài khoản.
- HashRouter và base path cấu hình được cho GitHub Pages.

## Thiết lập Supabase — từng bước

Project hiện tại đã được cấu hình và kiểm thử. Các bước sau dành cho việc tái tạo trên project mới. Nếu dùng CLI lần đầu trên project hiện tại đã áp dụng SQL bằng Dashboard, xem mục migration repair trong `docs/PROJECT_SETUP.md` trước khi chạy db push.

1. Tạo một project tại Supabase. Lưu project reference trong Dashboard → Project Settings.
2. Cài Supabase CLI theo [hướng dẫn chính thức](https://supabase.com/docs/guides/cli/getting-started), đăng nhập, liên kết và áp dụng toàn bộ migration theo thứ tự:

   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   Migration đầu bật `pg_jsonschema` trong schema `extensions`, tạo bảng, quyền và RLS. Migration thứ hai chứa JSON Schema được sinh từ Zod; migration thứ ba chứa thao tác import, sửa dành cho người tạo và chấm bài có giao dịch. Không bỏ qua migration thứ hai. Nếu extension đã được cài trong schema khác, dùng project mới hoặc chuyển extension sang `extensions` trước khi áp dụng; không sửa các bảng bằng SQL thủ công.
3. Authentication → Providers → Email: bật email/password và **Confirm email**. Cấu hình SMTP cho gửi email ổn định; gói mặc định có giới hạn và không phù hợp với thử nghiệm hàng loạt.
4. Authentication → URL Configuration:
   - **Site URL**: `https://USERNAME.github.io/REPOSITORY/` (hoặc domain gốc của bạn).
   - **Redirect URLs**: thêm chính xác `https://USERNAME.github.io/REPOSITORY/` và `http://127.0.0.1:5173/` cho local. Nếu dùng `localhost` hoặc cổng khác, thêm đúng URL đó.
   - Không thêm `#/reset-password` vào URL callback. Supabase dùng fragment để chuyển token. Ứng dụng xử lý token trước khi khởi động HashRouter rồi chuyển đến trang đặt mật khẩu nếu có `type=recovery`.
5. Deploy ba Edge Function:

   ```sh
   supabase functions deploy import-lesson
   supabase functions deploy grade-quiz
   supabase functions deploy edit-lesson
   ```

   `verify_jwt=false` trong config là có chủ đích: từng function tự xác minh bearer JWT bằng `auth.getUser(token)` trước khi dùng service role. Không chỉ giải mã token. Config hỗ trợ publishable key mới.
6. Supabase tự cung cấp `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` trong Edge runtime. Giữ service-role key **chỉ ở backend**; không đặt vào biến bắt đầu `VITE_`, GitHub Pages, kho mã, prompt hay trình duyệt. Nếu dùng runtime tùy chỉnh, cấu hình ba biến này bằng secret store của runtime.
7. Project Settings → API: lấy project URL và public publishable/anon key. Điền `.env` và khởi động lại Vite. Publishable/anon key là public; an toàn phụ thuộc RLS. Không dùng secret/service-role key thay thế.
8. Chạy kiểm thử hai tài khoản theo [CHECKLIST.md](docs/CHECKLIST.md). Kiểm tra callback xác nhận email và reset cả local lẫn GitHub Pages. Kiểm thử nhúng không xác nhận khả năng gửi email, extension thực hoặc gateway Edge của project.

## GitHub Pages — từng bước

1. Tạo repository GitHub, đưa nội dung thư mục dự án này vào thư mục gốc repository và push nhánh `main`. Chỉ commit mã nguồn; `.env`, `node_modules`, `dist` đã bị bỏ qua.
2. Repository → Settings → Secrets and variables → Actions → **Variables**, thêm:
   - `VITE_SUPABASE_URL`: URL Supabase của bạn.
   - `VITE_SUPABASE_ANON_KEY`: publishable/anon key public.
   - `VITE_BASE_PATH`: `/<repository>/` hoặc `/` cho repository `USERNAME.github.io` hay custom domain. Nếu bỏ trống, workflow tự dùng `/<repository>/`.
3. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
4. Push `main` hoặc Actions → Verify and deploy AI StudyLab → Run workflow. Workflow cài theo lockfile, kiểm tra schema không lệch, chạy tests, TypeScript, build và deploy `dist`.
5. Cập nhật Site URL/Redirect URLs Supabase đúng URL Pages. Các đường dẫn ứng dụng dạng `/#/lessons/...` nên tải lại trực tiếp được trên hosting tĩnh.
6. Kiểm tra đăng ký → xác nhận email → đăng nhập → đổi ngôn ngữ → nhập mẫu → nộp → làm lại → lịch sử → đăng xuất. Không coi deployment frontend thành công là đã xác minh backend.

Build thủ công cho subpath:

```sh
VITE_BASE_PATH=/YOUR_REPOSITORY/ npm run build
```

Thiết lập base tuân theo [Vite static deployment](https://vite.dev/guide/static-deploy). RLS và service role dựa theo [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Kiểm thử mẫu đầu tiên

1. Đăng ký tài khoản và xác nhận email; đăng nhập.
2. Mở **AI 결과 가져오기 / Nhập nội dung AI** từ thanh bên.
3. Chọn mẫu **쿨롱의 법칙** → tải mẫu. Hoặc mở `examples/coulomb.json` và dán JSON.
4. Kiểm tra lý thuyết và mở các câu hỏi trong phần xem trước. Bấm lưu vào tài khoản.
5. Đọc lý thuyết, bấm hoàn thành, bắt đầu luyện tập. Chọn, thay đổi đáp án và tải lại trang để kiểm tra bản nháp.
6. Nộp sau khi xác nhận. Mỗi câu đúng 10 điểm; câu chưa trả lời tính sai. Đáp án chỉ xuất hiện trong workflow làm bài sau khi server lưu lượt làm thành công.
7. Làm lại; kiểm tra hai lượt độc lập trong lịch sử và câu sai trong sổ tay.
8. Đăng nhập tài khoản thứ hai: dữ liệu tài khoản đầu không xuất hiện.

## Cấu trúc mã nguồn

| Đường dẫn | Vai trò |
|---|---|
| `supabase/functions/_shared/lesson.ts` (frontend re-export: `src/schemas/lesson.ts`) | Schema Zod chuẩn, giới hạn và validation |
| `scripts/export-schema.ts` | Sinh JSON Schema cho prompt và SQL |
| `src/app/Auth.tsx` | Phiên đăng nhập và protected routes |
| `src/lib/` | Supabase, API, prompt, bản nháp |
| `src/pages/` | Các trang ứng dụng |
| `src/components/` | Layout, Markdown an toàn, nội dung bài, UI |
| `src/i18n/{ko,vi}.json` | Bản dịch giao diện |
| `supabase/migrations/` | Cơ sở dữ liệu, RLS, thao tác có giao dịch |
| `supabase/functions/` | Xác thực + import/edit/grade |
| `examples/`, `public/examples/` | Hai bài học mẫu và bản tải qua UI |
| `tests/` | Kiểm thử schema, UI, auth và PostgreSQL |
| `.github/workflows/deploy.yml` | Kiểm tra và GitHub Pages |

Xem [ARCHITECTURE.md](docs/ARCHITECTURE.md), [SCHEMA.md](docs/SCHEMA.md), [CHECKLIST.md](docs/CHECKLIST.md) và [VERIFICATION.md](docs/VERIFICATION.md).

## Trạng thái xác minh

Mã nguồn tích hợp Supabase đã có; **đã kết nối frontend, áp dụng migration/RLS và deploy ba Edge Function trên project thật**. Kiểm thử pg_jsonschema/RLS và luồng trình duyệt với tài khoản thật đã đạt: nhập mẫu, lưu tiến độ, giữ draft, nộp hai lượt 20/100 và 100/100, lịch sử, sổ tay và dashboard. Khôi phục mật khẩu qua email chưa được kiểm thử thực tế. Dashboard không có dữ liệu giả. Kết quả kiểm thử/build thực tế và giới hạn được ghi trong `docs/VERIFICATION.md`.
