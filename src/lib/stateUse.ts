// A state outline for HTML built in the browser: a reference to the symbol in
// the page's StateSprite.astro. No DOM and no Node APIs here, so the build and
// the browser can share it.
export const stateShapeUse = (st: string, size = 24) =>
  `<svg class="stshape" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><use href="#st-${st}"/></svg>`;
