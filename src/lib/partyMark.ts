// The party mark: a 16px square with the party's letter (see .pmark in
// base.css). Shared by the build and the browser. No DOM here.
export type MarkParty = 'D' | 'R' | 'I';

const WORD: Record<MarkParty, string> = { D: 'Democratic', R: 'Republican', I: 'Independent' };

/** Accepts D, R, I or the data's DEM, GOP, IND. Anything else gets no mark. */
export function markParty(p: string | null | undefined): MarkParty | null {
  if (p === 'D' || p === 'DEM') return 'D';
  if (p === 'R' || p === 'GOP') return 'R';
  if (p === 'I' || p === 'IND') return 'I';
  return null;
}

export function partyMarkHtml(p: string | null | undefined): string {
  const m = markParty(p);
  return m ? `<span class="pmark" data-party="${m}" role="img" aria-label="${WORD[m]}">${m}</span>` : '';
}
