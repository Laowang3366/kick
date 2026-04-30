import { describe, expect, it } from "vitest";
import { queryClient } from "./query-client";

describe("query client performance defaults", () => {
  it("avoids aggressive foreground refetching for normal page data", () => {
    const queryDefaults = queryClient.getDefaultOptions().queries;

    expect(queryDefaults?.staleTime).toBe(60_000);
    expect(queryDefaults?.refetchOnWindowFocus).toBe(false);
  });
});
