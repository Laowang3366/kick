export function shouldRenderTutorialInlineArticle(isMobile: boolean) {
  return !isMobile;
}

export function shouldRenderTutorialReaderOverlay({
  isMobile,
  selectedArticle,
}: {
  isMobile: boolean;
  selectedArticle: unknown | null | undefined;
}) {
  return isMobile && Boolean(selectedArticle);
}

export function getLiteMobileContentPaddingClassName(isMobile: boolean) {
  return isMobile ? "pb-[calc(104px+env(safe-area-inset-bottom))]" : "";
}
