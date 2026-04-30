import { describe, expect, it } from "vitest";
import viteConfig from "../../../vite.config";

describe("vite performance configuration", () => {
  it("keeps the Vite preload helper out of heavy async vendor chunks", () => {
    const output = viteConfig.build?.rollupOptions?.output;
    const manualChunks = Array.isArray(output) ? output[0]?.manualChunks : output?.manualChunks;

    expect(typeof manualChunks).toBe("function");
    expect((manualChunks as (id: string) => string | undefined)("\0vite/preload-helper.js")).toBe("vite-helper");
  });
});
