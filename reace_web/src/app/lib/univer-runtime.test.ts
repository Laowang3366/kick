import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  importUniverPresets,
  importUniverSheetsCore,
  importUniverSheetsCoreLocaleZhCN,
  importUniverSheetsCoreStyles,
} = vi.hoisted(() => ({
  importUniverPresets: vi.fn(async () => ({
    createUniver: vi.fn(),
    LocaleType: { ZH_CN: "zh-CN" },
    mergeLocales: vi.fn(),
  })),
  importUniverSheetsCore: vi.fn(async () => ({
    UniverSheetsCorePreset: vi.fn(),
  })),
  importUniverSheetsCoreLocaleZhCN: vi.fn(async () => ({
    default: { locale: "zh-CN" },
  })),
  importUniverSheetsCoreStyles: vi.fn(async () => ({})),
}));

vi.mock("./univer-runtime-imports", () => ({
  importUniverPresets,
  importUniverSheetsCore,
  importUniverSheetsCoreLocaleZhCN,
  importUniverSheetsCoreStyles,
}));

describe("univer runtime loader", () => {
  beforeEach(() => {
    vi.resetModules();
    importUniverPresets.mockClear();
    importUniverSheetsCore.mockClear();
    importUniverSheetsCoreLocaleZhCN.mockClear();
    importUniverSheetsCoreStyles.mockClear();
  });

  test("loads and caches Univer runtime modules once", async () => {
    const { loadUniverRuntime } = await import("./univer-runtime");

    const [firstRuntime, secondRuntime] = await Promise.all([
      loadUniverRuntime(),
      loadUniverRuntime(),
    ]);

    expect(firstRuntime).toBe(secondRuntime);
    expect(importUniverPresets).toHaveBeenCalledTimes(1);
    expect(importUniverSheetsCore).toHaveBeenCalledTimes(1);
    expect(importUniverSheetsCoreLocaleZhCN).toHaveBeenCalledTimes(1);
    expect(importUniverSheetsCoreStyles).toHaveBeenCalledTimes(1);
  });
});
