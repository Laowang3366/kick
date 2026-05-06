export function readSharedTextFromUrl(url: string): string {
  const parsedUrl = new URL(url);
  const sharedParts = [parsedUrl.searchParams.get('text'), parsedUrl.searchParams.get('url')]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return sharedParts.join('\n');
}
