# TODO — Light Blue Premium Futuristic Theme

- [x] Step 1: Remap legacy dark tokens in `css/variables.css` to light-blue palette + adjust glass/shadows/glow tokens for readability.
- [x] Step 2: Update `css/base.css` body background/text, selection, focus, and scrollbars to light theme.
- [x] Step 3: Update `css/components.css` and `css/dashboard.css` surfaces, borders, telemetry, cards, buttons, and section labels to use light-blue variables.
- [x] Step 4: Update `css/splash.css` to light-blue holographic startup (rings, loader, terminal).
- [x] Step 5: Retint `css/animations.css` glow pulses where they reference legacy dark glow tokens (ensure still reads well on light).
- [x] Step 6: Update `index.html` meta theme-color to light-blue (since HTML cannot use CSS vars).
- [x] Step 7: Quick run/build check (open in browser / run any dev command) and do a second pass for any remaining hardcoded/dark tokens.

# TODO — Service Worker continuation (offline reliability)

- [x] SW1: Harden install caching (tolerate missing assets; avoid failing whole install).
- [x] SW2: Fix cache keys for './' and ensure index.html is always retrievable.
- [x] SW3: Implement stale-while-revalidate for same-origin assets.
- [x] SW4: Add navigation fallback to a cached Response or minimal HTML.
- [ ] SW5: Run a quick verification (open in browser, reload offline, check console).



