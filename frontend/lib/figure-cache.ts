const figureCache = new Map<string, string>();

export function getCachedFigure(name: string): string | null {
  return figureCache.get(name) ?? null;
}

export function setCachedFigure(name: string, url: string) {
  figureCache.set(name, url);
}

export function clearFigureCache() {
  for (const url of figureCache.values()) {
    URL.revokeObjectURL(url);
  }
  figureCache.clear();
}
