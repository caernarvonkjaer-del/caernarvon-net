# Portfolio UI Starter Kit

Reference design tokens, theme manager, accessible SVG icon dictionary, and responsive card styles (Bootstrap 5 companion) for cross-portfolio legaltech applications.

---

## Design Principle: Theme and UI Preferences Live in `localStorage`

Theme (and any other pure UI-only display preference — nothing about case,
document, or user data) always persists to `localStorage`, never bundled
into an application's own case/document persistence layer, even if that
layer is otherwise the app's single source of truth. Two reasons, both
load-bearing:

1. **It carries nothing sensitive.** A display preference needs no
   encryption, so it gains nothing from living inside an app's
   security boundary — and it shouldn't be gated behind whatever that
   boundary requires (a password prompt, a decrypt step, a network round
   trip) just to know which theme to paint.
2. **It must be readable synchronously, before first paint.** `localStorage`
   is the only browser storage available to a classic, synchronous inline
   `<head>` script. Anything async — an encrypted save file, IndexedDB, a
   server call — cannot resolve before the page has already painted once,
   which reintroduces the exact flash-of-wrong-theme this kit's pre-paint
   script exists to prevent.

Adopting projects should apply this rule to any of their own UI-only
settings the same way, not just theme.

---

## Assets Included

| File | Purpose |
| :--- | :--- |
| **`tokens.css`** | Semantic color tokens (`--brand`, `--ink`, `--surface`, `--line`, `--field`), radii, shadows, and contrast-verified dark mode palette. |
| **`cards.css`** | Responsive card structures (`.summary-box`, `.entry-card`, `.entry-card-header`, `.entry-card-actions`, container queries scoped to cards). Requires Bootstrap 5 grid/button classes. |
| **`prepaint.snippet.js`** | Synchronous classic `<script>` to place inline in `<head>` before stylesheets to prevent theme flash (FOUC). |
| **`theme.js`** | Runtime theme manager (`applyTheme`, `toggleTheme`, `currentTheme`) supporting persistence adapters and `.topnav-theme`/`#theme-toggle-btn` selectors. |
| **`icons.js`** | 30+ accessible inline SVG icons aligned to a 24x24 grid with 1.7px stroke weight and helper `ic(name, size)`. |

---

## Integration Guide

### 1. Archetype 1 (Client-Side Static PWA / Vanilla JS + Bootstrap 5)

1. Add the synchronous pre-paint script inline at the top of `<head>`:

   ```html
   <head>
     <meta charset="utf-8">
     <script>
       (function(){try{var s=localStorage.getItem('app_theme_preference');var d=s?(s==='dark'):(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var t=d?'dark':'light';document.documentElement.setAttribute('data-theme',t);document.documentElement.setAttribute('data-bs-theme',t);}catch(e){}})();
     </script>
     <link rel="stylesheet" href="lib/bootstrap.min.css">
     <link rel="stylesheet" href="src/styles/tokens.css">
     <link rel="stylesheet" href="src/styles/cards.css">
   </head>
   ```

2. Wire theme toggling at runtime:

   ```js
   import { toggleTheme, applyTheme, currentTheme } from './src/styles/theme.js';

   // Bind to UI buttons
   document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
     toggleTheme((newTheme) => saveAppState('theme', newTheme));
   });
   ```

3. Render accessible icon buttons:

   ```js
   import { ic } from './src/styles/icons.js';

   // Note: Enclosing button MUST have an accessible label since the SVG has aria-hidden="true"
   const buttonHtml = `<button class="btn btn-outline-secondary" aria-label="Download filing PDF" title="Download PDF">${ic('download', 16)} Download</button>`;
   ```

### 2. Archetype 2 (Python Data & Document Pipeline / Streamlit)

1. Configure primary and surface colors in `.streamlit/config.toml`:

   ```toml
   [theme]
   primaryColor = "#820024"
   backgroundColor = "#f7f9fc"
   secondaryBackgroundColor = "#ffffff"
   textColor = "#111a2b"
   ```

2. Inject `tokens.css` and `cards.css` into custom components via `st.markdown("<style>...</style>", unsafe_allow_html=True)`.

### 3. Archetype 3 (Full-Stack Containerized App / React 19 + Tailwind v4)

1. Import `tokens.css` into root stylesheet and map `@theme` variables:

   ```css
   @import "tailwindcss";
   @import "./tokens.css";

   @theme {
     --color-brand: var(--brand);
     --color-surface: var(--surface);
     --color-ink: var(--ink);
     --color-line: var(--line);
   }
   ```

2. Use standard React state or Zustand to drive `<html data-theme="...">`. Wrap icon SVG strings or create dedicated React SVG icon components.
