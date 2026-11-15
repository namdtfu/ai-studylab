import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { act } from "react";
import i18n from "../src/i18n";
import {
  curriculumSchema,
  defaultCurriculum,
  hasCourse,
  personalCurriculum,
  type Curriculum,
} from "../src/lib/curriculum";
import { readFileSync } from "node:fs";
const personalExample: Curriculum = {
  schemaVersion: "1.0",
  semesters: [
    { id: "semester-1", number: 1, subjects: ["수학 1", "물리학 1"] },
    { id: "semester-2", number: 2, subjects: ["수학 2", "물리학 2"] },
    { id: "semester-3", number: 3, subjects: [] },
  ],
};
vi.mock("../src/app/Auth", () => ({
  useAuth: () => ({ user: { id: "owner" } }),
}));
vi.mock("../src/lib/api", () => ({
  api: { curriculum: vi.fn(), saveCurriculum: vi.fn() },
}));
import { api } from "../src/lib/api";
import { Prompt } from "../src/pages/Prompt";

beforeEach(async () => {
  await act(() => i18n.changeLanguage("vi"));
  vi.mocked(api.curriculum).mockResolvedValue(structuredClone(personalExample));
  vi.mocked(api.saveCurriculum).mockImplementation(async (_id, catalog) =>
    structuredClone(catalog),
  );
});
afterEach(async () => {
  await act(() => i18n.changeLanguage("ko"));
  vi.clearAllMocks();
});
function mount() {
  return render(
    <MemoryRouter>
      <Prompt />
    </MemoryRouter>,
  );
}
async function picker() {
  return screen.findByRole("button", { name: "Chọn học kỳ và môn học" });
}

it("starts empty and hides the legacy seed until the account explicitly configures it", () => {
  expect(defaultCurriculum.semesters).toEqual([]);
  expect(
    personalCurriculum({
      curriculum: personalExample,
      curriculum_initialized: false,
    }),
  ).toEqual(defaultCurriculum);
  expect(
    personalCurriculum({
      curriculum: personalExample,
      curriculum_initialized: true,
    }),
  ).toEqual(personalExample);
  expect(curriculumSchema.safeParse(defaultCurriculum).success).toBe(true);
  const invalid = structuredClone(personalExample);
  invalid.semesters[0].subjects = ["수학 1", " 수학 1 "];
  expect(curriculumSchema.safeParse(invalid).success).toBe(false);
  expect(
    hasCourse(personalExample, {
      semesterId: "semester-2",
      subject: "물리학 2",
    }),
  ).toBe(true);
  expect(
    hasCourse(personalExample, {
      semesterId: "semester-1",
      subject: "물리학 2",
    }),
  ).toBe(false);
  expect(
    readFileSync(
      "supabase/migrations/202611150006_personal_curriculum.sql",
      "utf8",
    ),
  ).toContain(JSON.stringify(defaultCurriculum));
});
it("lets a new account create its first semester and its own major's subjects", async () => {
  vi.mocked(api.curriculum).mockResolvedValue(
    structuredClone(defaultCurriculum),
  );
  const user = userEvent.setup();
  mount();
  await picker();
  await user.click(
    screen.getByRole("button", { name: "Quản lý học kỳ và môn học" }),
  );
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).queryByLabelText("Tên môn 1")).toBeNull();
  await user.click(within(dialog).getByRole("button", { name: "Thêm học kỳ" }));
  await user.type(
    within(dialog).getByRole("textbox", { name: "Tên môn học mới" }),
    "경제학 입문",
  );
  await user.click(within(dialog).getByRole("button", { name: "Thêm môn" }));
  await user.click(within(dialog).getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(api.saveCurriculum).toHaveBeenCalled());
  const saved = vi.mocked(api.saveCurriculum).mock.calls[0];
  expect(saved[0]).toBe("owner");
  expect(saved[1].semesters).toHaveLength(1);
  expect(saved[1].semesters[0].number).toBe(1);
  expect(saved[1].semesters[0].subjects).toEqual(["경제학 입문"]);
  expect(screen.queryByRole("checkbox", { name: "물리학 1" })).toBeNull();
});
it("removes academic-level input and requires a chosen subject", async () => {
  const user = userEvent.setup();
  mount();
  await picker();
  expect(screen.queryByLabelText("Trình độ")).toBeNull();
  await user.type(screen.getByLabelText("Chương"), "Chương 30");
  await user.type(screen.getByLabelText("Chủ đề bài học"), "Faraday");
  await user.click(screen.getByRole("button", { name: "Tạo prompt" }));
  expect(screen.getByText("Hãy chọn một môn trong học kỳ.")).toBeVisible();
  expect(
    screen.queryByRole("textbox", { name: "Xem trước bài học" }),
  ).toBeNull();
});
it("keeps exactly one checkbox selected across semesters and builds a prompt for that subject", async () => {
  const user = userEvent.setup();
  mount();
  await user.click(await picker());
  await user.click(screen.getByRole("checkbox", { name: "수학 1" }));
  await user.click(await picker());
  expect(screen.getByRole("checkbox", { name: "수학 1" })).toBeChecked();
  await user.click(screen.getByRole("button", { name: /^Kỳ 2/ }));
  await user.click(screen.getByRole("checkbox", { name: "물리학 2" }));
  await user.click(await picker());
  await user.click(screen.getByRole("button", { name: /^Kỳ 1/ }));
  expect(screen.getByRole("checkbox", { name: "수학 1" })).not.toBeChecked();
  await user.keyboard("{Escape}");
  await user.type(screen.getByLabelText("Chương"), "Chương 30");
  await user.type(screen.getByLabelText("Chủ đề bài học"), "Faraday");
  await user.click(screen.getByRole("button", { name: "Tạo prompt" }));
  const output = screen.getByRole("textbox", {
    name: "Xem trước bài học",
  }) as HTMLTextAreaElement;
  expect(output.value).toContain("Subject: 물리학 2");
  expect(output.value).toContain("Academic level: University");
});
it("shows the empty third semester and closes the menu with Escape", async () => {
  const user = userEvent.setup();
  mount();
  await user.click(await picker());
  await user.click(screen.getByRole("button", { name: /^Kỳ 3/ }));
  expect(screen.getByText("Học kỳ này chưa có môn học.")).toBeVisible();
  await user.keyboard("{Escape}");
  expect(await picker()).toHaveAttribute("aria-expanded", "false");
});
it("edits and persists the account's curriculum, and loads it on a later visit", async () => {
  const user = userEvent.setup();
  const view = mount();
  await picker();
  await user.click(
    screen.getByRole("button", { name: "Quản lý học kỳ và môn học" }),
  );
  const dialog = screen.getByRole("dialog");
  await user.clear(within(dialog).getByLabelText("Tên môn 1"));
  await user.type(within(dialog).getByLabelText("Tên môn 1"), "수학 A");
  await user.click(
    within(dialog).getByRole("button", { name: "Xóa môn 물리학 1" }),
  );
  await user.type(
    within(dialog).getByRole("textbox", { name: "Tên môn học mới" }),
    "화학 1",
  );
  await user.click(within(dialog).getByRole("button", { name: "Thêm môn" }));
  await user.click(within(dialog).getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(api.saveCurriculum).toHaveBeenCalled());
  const saved = vi.mocked(api.saveCurriculum).mock.calls[0];
  expect(saved[0]).toBe("owner");
  expect(saved[1].semesters[0].subjects).toEqual(["수학 A", "화학 1"]);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  view.unmount();
  vi.mocked(api.curriculum).mockResolvedValue(saved[1]);
  mount();
  await user.click(await picker());
  expect(screen.getByRole("checkbox", { name: "화학 1" })).toBeVisible();
});
it("keeps edits open after save failure and does not claim success", async () => {
  const user = userEvent.setup();
  vi.mocked(api.saveCurriculum).mockRejectedValue(new Error("offline"));
  mount();
  await picker();
  await user.click(
    screen.getByRole("button", { name: "Quản lý học kỳ và môn học" }),
  );
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Lưu",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Không lưu được danh sách môn học",
  );
  expect(screen.getByRole("dialog")).toBeVisible();
});
it("blocks duplicate subject names before saving", async () => {
  const user = userEvent.setup();
  mount();
  await picker();
  await user.click(
    screen.getByRole("button", { name: "Quản lý học kỳ và môn học" }),
  );
  const dialog = screen.getByRole("dialog");
  await user.type(
    within(dialog).getByRole("textbox", { name: "Tên môn học mới" }),
    "수학 1",
  );
  await user.click(within(dialog).getByRole("button", { name: "Thêm môn" }));
  expect(within(dialog).getByRole("alert")).toHaveTextContent(
    "Tên môn bị trùng",
  );
  expect(api.saveCurriculum).not.toHaveBeenCalled();
});
