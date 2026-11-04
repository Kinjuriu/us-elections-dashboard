// The one store every module on the page shares. Its configuration comes
// from the JSON block the build writes into the page (#dash-config); its
// first state comes from the URL. Every change is written back to the URL
// with replaceState, so a view can be shared as a link and survives reload
// without filling the back button with every click.
import { createStore, parseState, serializeState, type StoreConfig } from '../lib/store';

const cfg = JSON.parse(document.getElementById('dash-config')!.textContent!) as StoreConfig;

export const config = cfg;
export const store = createStore(cfg, parseState(location.search, cfg));

function writeUrl() {
  const url = new URL(location.href);
  url.search = serializeState(store.get());
  history.replaceState(null, '', url);
}
store.subscribe(writeUrl);
// A link with invalid values is tidied up on arrival.
if (location.search) writeUrl();

// ---------- State view: open from anywhere, close with Esc ----------

let opener: HTMLElement | null = null;

/**
 * Open a state's record. `from` is the control that asked, so Close can
 * hand focus back to it; `focusPanel` moves focus (and so the page) to the
 * panel beside the map, for requests from further down the page.
 */
export function openState(st: string, from: HTMLElement | null = null, focusPanel = false) {
  opener = from;
  store.set({ state: st });
  if (focusPanel) document.dispatchEvent(new CustomEvent('dash:focus-panel'));
}

/** Close the state view and return focus to whatever opened it. */
export function closeState(): HTMLElement | null {
  const back = opener && document.contains(opener) ? opener : null;
  opener = null;
  store.set({ state: null });
  return back;
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !store.get().state || e.defaultPrevented) return;
  // A native select handles its own Esc.
  if ((e.target as Element | null)?.closest?.('select')) return;
  const back = closeState();
  back?.focus();
});
