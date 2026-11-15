# Báo cáo xác minh — 15/11/2026

## Đã chạy thành công

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | **40/40** tests, 6 suites |
| `npm run build` | TypeScript strict và Vite production build thành công |
| `VITE_BASE_PATH=/test-repository/ npm run build` | Build với repository subpath thành công |
| `scripts/check-build.mjs` | 8 entry assets tồn tại, đúng prefix cho cả `/` và `/test-repository/` |
| Deno `check` ba Edge Function | Thành công: import-lesson, grade-quiz, edit-lesson |
| `npm audit --audit-level=low` | **0 vulnerabilities** theo lockfile tại thời điểm kiểm tra |
| Local HTTP | Vite trả HTTP 200 |
| Trình duyệt | Trang đăng nhập/đăng ký, đổi Hàn–Việt, đổi theme và giữ sau reload; protected history chuyển về login |
| Mobile 390 × 844 | Không tràn ngang (clientWidth = scrollWidth = 390); form đăng ký đọc được và cuộn được |

Các test bao gồm: hai mẫu đúng schema; JSON sai cú pháp/thiếu field/sai version/số câu/ID/lựa chọn/giải thích; đồng bộ Zod→JSON Schema→prompt→SQL; an toàn Markdown; đáp án không xuất hiện trong quiz trước nộp; chọn/đổi đáp án, điều hướng và draft; xác nhận nộp, câu bỏ trống và retry cùng submission ID; bảo vệ route và trạng thái hết phiên/đăng xuất; bản dịch và lưu ngôn ngữ.

Kiểm thử PostgreSQL dùng **PGlite**, chạy PL/pgSQL và RLS thật: tạo schema, import riêng, loại đáp án khỏi public content, chống import trùng, truy cập chéo tài khoản bị từ chối, không đọc được answer_keys, không gọi được RPC đặc quyền với role authenticated, không giả mạo điểm qua ghi trực tiếp, chấm điểm chính xác, snapshot bất biến, làm lại nhiều lần, giữ lịch sử qua sửa/xóa mềm và idempotency.

## Supabase thật: đã triển khai và xác minh

Project `yitolptsdnjxehzbwass` đã được áp dụng bốn migration qua SQL Editor trong giao dịch: pg_jsonschema, bảng, RLS, RPC import/edit/grade chỉ dành cho service_role và profile backfill.

Ba Edge Function `import-lesson`, `grade-quiz`, `edit-lesson` đã deploy qua Dashboard từ bundle tạo bởi `scripts/bundle-edge.mjs`. Theo phê duyệt của người dùng, legacy JWT gateway được tắt; function vẫn bắt buộc xác minh `auth.getUser(token)`.

Site URL và allowed redirect URL đã đặt thành `https://ai-studylab-gachon-1115.tranthuy141198.chatgpt.site/`. Email đăng ký và xác nhận email vẫn bật.

Kiểm thử SQL trên PostgreSQL Supabase thật trả **PASS**: pg_jsonschema chấp nhận mẫu đúng và từ chối thiếu title; nhập và chống nhập trùng; public content không chứa đáp án/giải thích; chấm 10/100 và 100/100; chống nộp trùng; làm lại; snapshot không đổi sau sửa bài; RLS chặn người dùng khác và quyền đọc answer_keys/gọi RPC đặc quyền. Tất cả fixture được rollback, không để lại tài khoản hoặc bài mẫu trong production.

REST không đăng nhập trả 401 permission denied cho lessons. Cả ba Edge Function trả 401 `unauthorized` với yêu cầu không phiên và JWT giả; CORS preflight trả 200.

## Luồng trình duyệt với tài khoản thật — đã đạt

Người dùng tự đăng ký/xác nhận email và đăng nhập trong Cốc Cốc. Đã xác nhận dashboard có phiên thật rồi thực hiện:

1. Tải mẫu Coulomb, xem trước và lưu qua `import-lesson` vào tài khoản riêng.
2. Đánh dấu hoàn thành lý thuyết; tiến độ được lưu vào Supabase.
3. Chọn và thay đổi đáp án; chọn 3 câu, tải lại trình duyệt: khôi phục cả 3 lựa chọn.
4. Nộp 2 đáp án đúng, 1 sai và 7 câu trống; hộp thoại cảnh báo đúng 7 câu trống; server trả **20/100**, đúng 2 sai 8.
5. Làm lại: bản nháp mới trống; trả lời đủ 10 câu và nộp, server trả **100/100**, đúng 10 sai 0.
6. Lịch sử hiển thị hai attempt ID độc lập với điểm 20/100 và 100/100.
7. Sổ tay hiển thị 8 mục sai hoặc bỏ trống, đáp án và giải thích; có liên kết luyện lại.
8. Dashboard lấy dữ liệu thật: 1 bài, 1 hoàn thành lý thuyết, 2 lượt, trung bình 60/100, tiến độ môn 1/1.

Bài mẫu và hai lượt trình duyệt được giữ trong tài khoản của người dùng để demo. Đây là dữ liệu nộp thực tế, không phải thống kê giả. Các fixture SQL của phần kiểm thử database đã rollback riêng.

## Giới hạn của kiểm thử

- PGlite không có extension `pg_jsonschema`: test thay riêng hàm extension bằng no-op. Migration chứa schema vẫn được tạo và kiểm tra cú pháp; Zod và sự đồng bộ schema được test độc lập. Giới hạn này chỉ áp dụng bộ test nhúng; pg_jsonschema đã được kiểm thử riêng trên Supabase thật.
- Đăng nhập và luồng học thật đã được xác minh. Người dùng tự xử lý email xác nhận; agent không đọc hộp thư. Chưa thử email khôi phục mật khẩu hoặc thời hạn gửi email trên SMTP production.
- Luồng tài khoản thật đã kiểm tra trên Cốc Cốc desktop. Mobile riêng cho các trang sau đăng nhập chưa được kiểm tra bằng backend thật.
- Chưa thử trích PDF trong trình duyệt bằng một tập PDF thực. Có giới hạn và xử lý lỗi trong mã, nhưng độ chính xác trích văn bản phụ thuộc tài liệu.
- GitHub Pages đã triển khai thành công tại `https://namdtfu.github.io/ai-studylab/`; workflow đầu tiên chạy thành công trên Ubuntu với 40 tests và production build.
- Build có cảnh báo annotation `@__PURE__` trong mã nguồn thư viện Zod; Rollup loại comment và hoàn tất. Không có lỗi TypeScript/build.

Hoàn tất cấu hình theo README rồi thực hiện toàn bộ `docs/CHECKLIST.md` trước khi gọi hệ thống là đã xác minh production.

## GitHub Pages — 15/11/2026

- Repository: https://github.com/namdtfu/ai-studylab
- Website: https://namdtfu.github.io/ai-studylab/
- Workflow đầu tiên: https://github.com/namdtfu/ai-studylab/actions/runs/43672074012 — build và deploy thành công.
- Base path: `/ai-studylab/`; frontend dùng lại project Supabase và ba Edge Function đã kiểm thử thật.
- Supabase Site URL đã đổi sang URL GitHub Pages; Redirect URLs giữ cả GitHub Pages và bản Sites cũ.
- Session đăng nhập được lưu theo origin của trình duyệt. Người dùng đăng nhập lại ở địa chỉ GitHub Pages bằng cùng tài khoản; dữ liệu Supabase được giữ nguyên.
