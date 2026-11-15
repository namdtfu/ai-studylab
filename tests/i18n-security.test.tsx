import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";
import { act } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../src/i18n";
import ko from "../src/i18n/ko.json";
import vi from "../src/i18n/vi.json";
import { Markdown } from "../src/components/Markdown";
import { AnswerReview } from "../src/pages/Results";
it("has a complete matching bilingual catalog and persists switching", async () => {
  expect(Object.keys(ko).sort()).toEqual(Object.keys(vi).sort());
  function Text() {
    const { t } = useTranslation();
    return <p>{t("dashboard")}</p>;
  }
  render(<Text />);
  await act(() => i18n.changeLanguage("vi"));
  expect(screen.getByText("Tổng quan")).toBeVisible();
  expect(localStorage.getItem("studylab:language")).toBe("vi");
  expect(document.documentElement.lang).toBe("vi");
  await act(() => i18n.changeLanguage("ko"));
});
it("ignores untrusted HTML, blocks JS URLs and renders math safely", () => {
  const { container } = render(
    <Markdown>
      {
        "<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[evil](javascript:alert%281%29)\n\n$x^2$"
      }
    </Markdown>,
  );
  expect(container.querySelector("script,img")).toBeNull();
  expect(container.querySelector("a")?.getAttribute("href")).not.toMatch(
    /^javascript:/,
  );
  expect(container.querySelector(".katex")).not.toBeNull();
});
it("renders stored post-submission feedback including unanswered selection", () => {
  render(
    <AnswerReview
      index={0}
      answer={{
        questionId: "q1",
        questionText: "Question",
        options: { A: "one", B: "two", C: "three", D: "four" },
        selected: null,
        correctOption: "B",
        explanation: "Stored server explanation",
        correct: false,
      }}
    />,
  );
  expect(screen.getByText("Stored server explanation")).toBeVisible();
  expect(screen.getByText(/미응답/)).toBeVisible();
});
