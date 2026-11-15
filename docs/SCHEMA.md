# Lesson schema 1.0

Nguồn chuẩn: `supabase/functions/_shared/lesson.ts` (frontend re-export: `src/schemas/lesson.ts`). Bản xuất: `examples/lesson.schema.json`. Mẫu đầy đủ: `examples/coulomb.json` và `examples/partial-derivatives.json`.

Metadata bắt buộc: `schemaVersion: "1.0"`, `subject`, `chapter`, `title`, `language`, `academicLevel`. Ngôn ngữ nội dung độc lập với ngôn ngữ giao diện; ứng dụng không tự dịch nội dung.

Nội dung bắt buộc: `learningObjectives[]`, `theorySections[{heading,content,example?}]`, `workedExamples[{title,problem,solution}]`, `commonMistakes[]`, `summary`.

`questions` chứa đúng 10 phần tử, theo thứ tự 5 `theory`, rồi 5 `application`. Mỗi phần tử có:

| Trường | Quy tắc |
|---|---|
| `id` | Duy nhất; 1–64 ký tự A–Z, a–z, 0–9, `_`, `-` |
| `category` | `theory` hoặc `application` đúng vị trí |
| `questionText` | Chuỗi không rỗng; có thể dùng Markdown/LaTeX |
| `options` | Chính xác object `{A,B,C,D}`, chuỗi không rỗng, khác nhau sau trim |
| `correctOption` | Một trong A/B/C/D |
| `explanation` | Chuỗi lời giải chi tiết, không rỗng |
| `sourcePage` | Số nguyên dương tùy chọn, chỉ dùng khi xác minh được trang nguồn |

Không cho thuộc tính thừa. Mỗi trường nội dung tối đa 30.000 ký tự, metadata có giới hạn nhỏ hơn. Tổng JSON tối đa 1.000.000 byte. Câu hỏi không có trường mã JavaScript hoặc HTML được thực thi. Tham khảo schema xuất để biết giới hạn đầy đủ.

Công thức inline `$x^2$`; công thức riêng dòng `$$F=k|q_1q_2|/r^2$$`. Trong JSON, dấu gạch chéo phải escape: `"$\\frac{1}{r^2}$"`. Không bọc toàn bộ JSON trong dấu ``` khi nhập.

Nhấn tải JSON Schema trên trang nhập để dùng ngoài ứng dụng. Khi cập nhật schema, chạy `npm run schema` và kiểm tra test đồng bộ. Ở hệ thống đã deploy, tạo migration mới cho validator; versioning có chủ đích, không thay đổi cấu trúc âm thầm.
