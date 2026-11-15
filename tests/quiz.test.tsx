import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { it, expect, vi } from "vitest";
vi.mock("../src/app/Auth", () => ({
  useAuth: () => ({ user: { id: "owner" } }),
}));
vi.mock("../src/lib/api", () => ({ api: { grade: vi.fn() } }));
import { api } from "../src/lib/api";
import { QuizRunner } from "../src/pages/Quiz";
import { publicContent, lessonSchema } from "../src/schemas/lesson";
import physics from "../examples/coulomb.json";
const version = {
  id: "version-1",
  lesson_id: "lesson-1",
  version: 1,
  content: publicContent(lessonSchema.parse(physics)),
};
function mount() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<QuizRunner version={version} />} />
        <Route path="/results/:id" element={<p>stored-result</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
it("changes answers, navigates and restores a draft without displaying keys", async () => {
  const u = userEvent.setup();
  const view = mount();
  expect(screen.getAllByRole("radio")).toHaveLength(4);
  expect(view.container.innerHTML).not.toContain("correctOption");
  expect(view.container.innerHTML).not.toContain(
    physics.questions[0].explanation,
  );
  await u.click(screen.getAllByRole("radio")[0]);
  expect(screen.getAllByRole("radio")[0]).toBeChecked();
  await u.click(screen.getAllByRole("radio")[1]);
  expect(screen.getAllByRole("radio")[1]).toBeChecked();
  await u.click(screen.getByRole("button", { name: "다음" }));
  expect(
    screen.getAllByRole("radio").every((r) => !(r as HTMLInputElement).checked),
  ).toBe(true);
  await u.click(screen.getByRole("button", { name: "이전" }));
  expect(screen.getAllByRole("radio")[1]).toBeChecked();
  view.unmount();
  mount();
  expect(screen.getAllByRole("radio")[1]).toBeChecked();
});
it("confirms submission, warns about unanswered and sends no official score", async () => {
  const u = userEvent.setup();
  vi.mocked(api.grade).mockResolvedValue({ attemptId: "attempt-1" });
  mount();
  await u.click(screen.getByRole("button", { name: "답안 제출" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("10");
  expect(api.grade).not.toHaveBeenCalled();
  await u.click(within(dialog).getByRole("button", { name: "답안 제출" }));
  expect(await screen.findByText("stored-result")).toBeVisible();
  const args = vi.mocked(api.grade).mock.calls.at(-1)!;
  expect(args.slice(0, 3)).toEqual(["lesson-1", "version-1", {}]);
  expect(args).toHaveLength(4);
  expect(localStorage.getItem("studylab:draft:owner:version-1")).toBeNull();
});
it("retains the same idempotency key on failure and retries, then gives retakes a new key", async () => {
  const u = userEvent.setup();
  vi.mocked(api.grade)
    .mockReset()
    .mockRejectedValueOnce(new Error())
    .mockResolvedValue({ attemptId: "a2" });
  mount();
  await u.click(screen.getByRole("button", { name: "답안 제출" }));
  await u.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "답안 제출",
    }),
  );
  await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
  const key = vi.mocked(api.grade).mock.calls[0][3];
  await u.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "답안 제출",
    }),
  );
  expect(await screen.findByText("stored-result")).toBeVisible();
  expect(vi.mocked(api.grade).mock.calls[1][3]).toBe(key);
  const next = JSON.parse(
    localStorage.getItem("studylab:draft:owner:version-1") || "null",
  );
  expect(next).toBeNull();
});
