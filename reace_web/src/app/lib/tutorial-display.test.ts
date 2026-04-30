import { describe, expect, it } from "vitest";
import {
  getLiteMobileContentPaddingClassName,
  getTutorialReaderScrollTargetSelector,
  shouldRenderTutorialCatalog,
  shouldRenderTutorialInlineArticle,
  shouldRenderTutorialReaderOverlay,
} from "./tutorial-display";

describe("tutorial mobile display helpers", () => {
  it("does not render the inline tutorial article on mobile", () => {
    expect(shouldRenderTutorialInlineArticle(true)).toBe(false);
    expect(shouldRenderTutorialInlineArticle(false)).toBe(true);
  });

  it("renders a reader overlay only after a mobile tutorial is selected", () => {
    expect(shouldRenderTutorialReaderOverlay({ isMobile: true, selectedArticle: { id: 1 } })).toBe(true);
    expect(shouldRenderTutorialReaderOverlay({ isMobile: true, selectedArticle: null })).toBe(false);
    expect(shouldRenderTutorialReaderOverlay({ isMobile: false, selectedArticle: { id: 1 } })).toBe(false);
  });

  it("hides the tutorial catalog while the mobile reader is open", () => {
    expect(shouldRenderTutorialCatalog({ isMobile: true, readerOpen: true })).toBe(false);
    expect(shouldRenderTutorialCatalog({ isMobile: true, readerOpen: false })).toBe(true);
    expect(shouldRenderTutorialCatalog({ isMobile: false, readerOpen: true })).toBe(true);
  });

  it("uses the app content scroller when opening the mobile reader", () => {
    expect(getTutorialReaderScrollTargetSelector(true)).toBe("main");
    expect(getTutorialReaderScrollTargetSelector(false)).toBeNull();
  });

  it("reserves bottom navigation space on lite mobile pages", () => {
    expect(getLiteMobileContentPaddingClassName(true)).toContain("pb-[calc(104px+env(safe-area-inset-bottom))]");
  });
});
