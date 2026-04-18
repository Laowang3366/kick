import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { PracticeCampaignHub } from "./PracticeCampaignHub";

class ResizeObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});

vi.mock("../components/ui/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("../components/LiteSurface", () => ({
  LitePageFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
}));

const navigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(({ queryKey }: any) => {
    const key = Array.isArray(queryKey) ? queryKey.join("/") : String(queryKey);
    if (key.includes("overview")) {
      return {
        data: {
          currentChapter: {
            id: 2,
            name: "函数基础",
          },
        },
      };
    }
    return {
      data: {
        chapters: [
          {
            id: 1,
            name: "表格入门",
            unlocked: true,
            completed: false,
            progress: 45,
            totalLevels: 8,
            totalStars: 12,
          },
          {
            id: 2,
            name: "函数基础",
            unlocked: true,
            completed: false,
            progress: 70,
            totalLevels: 10,
            totalStars: 18,
          },
        ],
      },
    };
  }),
}));

describe("PracticeCampaignHub", () => {
  test("shows a mobile chapter list with a continue action", () => {
    render(<PracticeCampaignHub />);

    expect(screen.getByRole("button", { name: /继续当前章节/i })).toBeInTheDocument();
  });
});
