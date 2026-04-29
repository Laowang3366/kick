export function shouldRenderCompactHeaderAccountAction({
  onlineLiteMode,
  isMobile,
}: {
  onlineLiteMode: boolean;
  isMobile: boolean;
}) {
  return onlineLiteMode && isMobile;
}

export function getCompactHeaderAccountButtonClassName() {
  return "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/18 bg-white/10 p-1 transition hover:border-white/34 hover:bg-white/16";
}
