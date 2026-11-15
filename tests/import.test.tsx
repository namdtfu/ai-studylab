import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { act } from "react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import i18n from "../src/i18n";
import physics from "../examples/coulomb.json";
vi.mock("../src/lib/api", () => ({ api: { import: vi.fn() } }));
import { api } from "../src/lib/api";
import { Import } from "../src/pages/Import";
beforeEach(async () => {
  await act(() => i18n.changeLanguage("vi"));
  vi.mocked(api.import).mockResolvedValue({
    lessonId: "saved-lesson",
    duplicate: false,
  });
});
afterEach(async () => {
  await act(() => i18n.changeLanguage("ko"));
  vi.clearAllMocks();
});
function Saved() {
  return <p>{useLocation().pathname}</p>;
}
function mount() {
  return render(
    <MemoryRouter initialEntries={["/import"]}>
      <Routes>
        <Route path="/import" element={<Import />} />
        <Route path="/lessons/:id" element={<Saved />} />
      </Routes>
    </MemoryRouter>,
  );
}
it("recovers pasted LaTeX JSON, previews and saves the validated lesson", async () => {
  const user = userEvent.setup();
  mount();
  const lesson = structuredClone(physics);
  lesson.summary = "__RAW__";
  const raw = JSON.stringify(lesson).replace(
    "__RAW__",
    String.raw`$\Phi_B = \frac{1}{2}$` + "\nSecond line",
  );
  await user.click(screen.getByRole("textbox", { name: "Dán JSON do AI tạo" }));
  await user.paste(raw);
  await user.click(
    screen.getByRole("button", { name: "Xác thực và xem trước" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("JSON");
  expect(api.import).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Sửa định dạng JSON" }));
  expect(screen.getByRole("status")).toHaveTextContent("Đã chuẩn hóa");
  expect(
    screen.getAllByRole("heading", { name: physics.title, level: 2 }),
  ).toHaveLength(2);
  await user.click(screen.getAllByRole("button", { name: "Lưu vào bài học của tôi" })[0]);
  await waitFor(() =>
    expect(screen.getByText("/lessons/saved-lesson")).toBeVisible(),
  );
  const content = vi.mocked(api.import).mock.calls[0][0];
  expect(content.questions).toEqual(physics.questions);
  expect(content.summary).toBe(
    String.raw`$\Phi_B = \frac{1}{2}$` + "\nSecond line",
  );
});
it("does not offer saving for an incomplete AI response after repair", async () => {
  const user = userEvent.setup();
  mount();
  await user.click(screen.getByRole("textbox", { name: "Dán JSON do AI tạo" }));
  await user.paste('{"schemaVersion":"1.0"}');
  await user.click(screen.getByRole("button", { name: "Sửa định dạng JSON" }));
  expect(screen.queryByRole("button", { name: "Lưu vào bài học của tôi" })).toBeNull();
  expect(api.import).not.toHaveBeenCalled();
  expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
});
