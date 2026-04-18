import type { FWorkbook, IWorkbookData } from "@univerjs/preset-sheets-core";
import {
  importUniverPresets,
  importUniverSheetsCore,
  importUniverSheetsCoreLocaleZhCN,
  importUniverSheetsCoreStyles,
} from "./univer-runtime-imports";

export type UniverRuntime = {
  createUniver: typeof import("@univerjs/presets").createUniver;
  LocaleType: typeof import("@univerjs/presets").LocaleType;
  mergeLocales: typeof import("@univerjs/presets").mergeLocales;
  UniverSheetsCorePreset: typeof import("@univerjs/preset-sheets-core").UniverSheetsCorePreset;
  UniverPresetSheetsCoreZhCN: typeof import("@univerjs/preset-sheets-core/locales/zh-CN").default;
};

let runtimePromise: Promise<UniverRuntime> | null = null;

export function loadUniverRuntime() {
  if (!runtimePromise) {
    runtimePromise = Promise.all([
      importUniverPresets(),
      importUniverSheetsCore(),
      importUniverSheetsCoreLocaleZhCN(),
      importUniverSheetsCoreStyles(),
    ]).then(([presets, sheetsCore, localeModule]) => ({
      createUniver: presets.createUniver,
      LocaleType: presets.LocaleType,
      mergeLocales: presets.mergeLocales,
      UniverSheetsCorePreset: sheetsCore.UniverSheetsCorePreset,
      UniverPresetSheetsCoreZhCN: localeModule.default,
    }));
  }
  return runtimePromise;
}

export function preloadUniverRuntime() {
  return loadUniverRuntime();
}

export type { FWorkbook, IWorkbookData };
