import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { Home } from "./Home";

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

vi.mock("../components/LiteSurface", () => ({
  LitePageFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const navigate = vi.fn();
const invalidateQueries = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => navigate,
  useLocation: () => ({ search: "" }),
}));

vi.mock("../lib/session", () => ({
  useSession: () => ({ isAuthenticated: true }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
  useMutation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useQuery: vi.fn(({ queryKey }: any) => {
    const key = Array.isArray(queryKey) ? queryKey.join("/") : String(queryKey);
    if (key.includes("tutorials/home")) {
      return {
        data: {
          learningTrack: "intermediate",
          categories: [
            {
              id: 1,
              name: "新手函数",
              audienceTrack: "beginner",
              articles: [{ id: 101, title: "SUM 入门", content: "<p>sum</p>", audienceTrack: "beginner", difficulty: "basic", functionTags: [] }],
            },
            {
              id: 2,
              name: "进阶查找",
              audienceTrack: "advanced",
              articles: [{ id: 201, title: "INDEX MATCH", content: "<p>index</p>", audienceTrack: "advanced", difficulty: "advanced", functionTags: [] }],
            },
          ],
        },
      };
    }
    if (key.includes("onboarding/recommendation")) {
      return {
        data: {
          track: "intermediate",
          needsAssessment: false,
          description: "进阶内容优先展示",
        },
      };
    }
    return {
      data: undefined,
    };
  }),
}));

describe("Home", () => {
  test("shows only categories matching the active learning track", () => {
    render(<Home />);

    expect(screen.queryByRole("button", { name: /新手函数/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /进阶查找/i })).toBeInTheDocument();
  });
});
