// Milestone 70, 70H: opening the Florida Courts E-Filing Portal beside the
// app. Moved from legacy-app.js.
// Opens the Florida e-filing portal as a separate window sized and
// positioned to the right half of the screen, and best-effort snaps this
// app's own window to the left half — giving a side-by-side layout without
// embedding the portal in an iframe (their site's own security headers,
// X-Frame-Options: SAMEORIGIN and CSP frame-ancestors 'self', block that
// outright — verified directly against their server, not a guess).
// noopener/noreferrer: the portal window can't reach back into this one via
// window.opener (standard hardening for any window.open to an outside site).
export function openFloridaCourtPortal(){
  const availW=screen.availWidth||window.innerWidth||1920;
  const availH=screen.availHeight||window.innerHeight||1080;
  const halfW=Math.floor(availW/2);

  window.open(
    'https://www.myflcourtaccess.com/default.aspx',
    '_blank',
    `left=${availW-halfW},top=0,width=${halfW},height=${availH},noopener,noreferrer`
  );

  // Repositioning THIS window only works in browsers that allow moveTo/
  // resizeTo on a window not opened via script — many block it as a
  // security measure. Wrapped so an unsupported browser just leaves this
  // window where it was, rather than erroring.
  try{
    window.moveTo(0,0);
    window.resizeTo(halfW,availH);
  }catch(e){/* not supported here — user can snap manually (Win+Left) */}
}
