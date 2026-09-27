// Milestone 70, 70K: the current route -- the page the filer is on -- which the
// router (src/core/navigation/router.js) owns and every module reads here.
//
// A leaf, so the modules the router itself imports (the form contract, the
// sidebar marks, validation's jump to a field) can read the route, and ask for
// a navigation, without importing the router back: that would be an import
// cycle. The router hands its navigate() in when it loads (provideNavigate()).
// Until 70K the route was the monolith's `let currentPage` behind a window
// accessor, and these modules read window.currentPage, window.getCurrentPage
// and window.navigate.
let currentPage = '/';
let navigateImpl = null;

/** The page the filer is on (a route such as '/p3', '/print' or '/dashboard'). */
export function getCurrentPage() {
  return currentPage;
}

/** The router's alone: the page it is showing. */
export function setCurrentPage(page) {
  currentPage = page;
}

/** The router hands its navigate() in once, as it loads. */
export function provideNavigate(fn) {
  navigateImpl = fn;
}

/** Navigate, for a module the router imports (it cannot import the router). */
export function navigateTo(page, options) {
  if (!navigateImpl) throw new Error('navigateTo() before the router loaded');
  return navigateImpl(page, options);
}
