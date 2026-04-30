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

export function shouldRenderTutorialCatalog({
  isMobile,
  readerOpen,
}: {
  isMobile: boolean;
  readerOpen: boolean;
}) {
  return !isMobile || !readerOpen;
}

export function getTutorialReaderScrollTargetSelector(readerOpen: boolean) {
  return readerOpen ? "main" : null;
}

export function getLiteMobileContentPaddingClassName(isMobile: boolean) {
  return isMobile ? "pb-[calc(104px+env(safe-area-inset-bottom))]" : "";
}
