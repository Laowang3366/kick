import { describe, expect, it } from "vitest";
import viteConfig from "../../../vite.config";

describe("vite performance configuration", () => {
  it("keeps the Vite preload helper out of heavy async vendor chunks", () => {
    const output = viteConfig.build?.rollupOptions?.output;
    const manualChunks = Array.isArray(output) ? output[0]?.manualChunks : output?.manualChunks;

    expect(typeof manualChunks).toBe("function");
    expect((manualChunks as (id: string) => string | undefined)("\0vite/preload-helper.js")).toBe("vite-helper");
  });

  it("keeps Univer language packs in a dedicated async chunk with a higher warning budget", () => {
    const output = viteConfig.build?.rollupOptions?.output;
    const manualChunks = Array.isArray(output) ? output[0]?.manualChunks : output?.manualChunks;
    const chunkName = (manualChunks as (id: string) => string | undefined)(
      "D:/project/recet_excel_project/reace_web/node_modules/@univerjs/preset-sheets-core/locales/zh-CN.js",
    );

    expect(chunkName).toBe("univer-locales");
    expect(viteConfig.build?.chunkSizeWarningLimit).toBeGreaterThanOrEqual(900);
  });
});
