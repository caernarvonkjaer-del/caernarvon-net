// Milestone 70: this classic script held the whole application once -- about
// 6,200 lines of global functions and state. Deliveries 70B to 70K moved every
// declaration into ES modules (each one's destination and delivery:
// tests/baseline/ms70-declaration-review.json), and 70K took the last: the
// route and the hash handler (src/core/navigation/router.js), the per-feature
// mounts (src/features-loader.js), the dashboard's headline total, the
// completion wrappers, the date-year guard (src/core/form/date-year-guard.js),
// the version (window.GuardianForms.version) and initApp() (startGuardianForms(),
// src/core/startup/bootstrap.js).
//
// It declares nothing and runs nothing. 70L deletes it, with its script tag in
// index.html, its static-copy rule in vite.config.js and its entry in the
// service worker's list.
