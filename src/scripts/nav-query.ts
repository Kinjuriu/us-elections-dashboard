// Carries the current query string (?year=2018&chamber=senate) onto the page
// links, so moving between pages keeps the year. Pages with the shared store
// announce each change with "dash:url"; other pages keep the query they
// arrived with. Without JavaScript the links open each page's default view.
const links = [...document.querySelectorAll<HTMLAnchorElement>('a[data-carry]')];
const bases = links.map((a) => a.getAttribute('href')!.split(/[?#]/)[0]);

function carry() {
  links.forEach((a, i) => { a.setAttribute('href', bases[i] + location.search); });
}
carry();
document.addEventListener('dash:url', carry);
