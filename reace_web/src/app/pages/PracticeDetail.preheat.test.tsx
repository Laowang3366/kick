import { render, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { PracticeDetail } from "./PracticeDetail";

const { scheduleExcelEditorPreload, navigate } = vi.hoisted(() => ({
  scheduleExcelEditorPreload: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../lib/excel-editor-preload", () => ({
  scheduleExcelEditorPreload,
}), { virtual: true });

vi.mock("react-router", () => ({
  useParams: () => ({ id: "1" }),
  useLocation: () => ({ pathname: "/practice/1", state: {} }),
  useNavigate: () => navigate,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
  useQuery: () => ({
    data: null,
    isError: false,
  }),
}));

describe("PracticeDetail editor preheat", () => {
  test("schedules editor preheat after the page mounts", async () => {
    render(<PracticeDetail />);

    await waitFor(() => {
      expect(scheduleExcelEditorPreload).toHaveBeenCalledTimes(1);
    });
  });
});
