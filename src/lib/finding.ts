// The finding line above the map. Usually the map's own headline; when the
// year has no results yet it says so plainly and names the Congress the
// cards show instead. No DOM here.
export function findingFor(year: number, headline: string, shownYears: Record<number, number> | undefined): string {
  const shown = shownYears?.[year];
  if (shown === undefined || shown === year) return headline;
  return `${year} results are not yet entered; showing the Congress elected in ${shown}`;
}
