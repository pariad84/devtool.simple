# devtool.simple

A single-file bookmarklet devtool. `fn.js` is the entire project — a tiny component/layout
framework plus the actual DevTool UI (popups, forms, lists, menus) built on top of it,
backed by localStorage. See README.md for what it does and how to install the bookmarklet.

## The three things that matter most

1. **Structural consistency.** Before adding or changing something, look at how the
   existing, similar pieces do it and match that shape. Don't let two things that do
   conceptually the same job (e.g. two "open a popup with a form" call sites) drift into
   different implementations — extract a shared helper instead.
2. **Terminology.** Check that names agree with each other end to end: the option key,
   the layout/function name, the visible UI label, and the log output should all describe
   the same concept the same way. A mismatch (e.g. a button labeled "Delete" calling a
   function named `remove`) is a bug waiting to confuse the next reader.
3. **Readable source organization.** Keep the file ordered so a reader can go top to
   bottom and never hit something that depends on code further down. Most foundational
   pieces first, most composed/top-level pieces last.

## Conventions

- **Parameter naming**: every function takes a single options object named `opt`
  (`function(opt = {})`), read as `opt.thing`. No positional params for anything with more
  than one input.
- **Self-contained components**: a component should not need a caller-injected callback to
  do its job. A button finds its own context via `e.target.closest('.__popup')` /
  `.querySelector('.__form')` etc. and acts on it directly, rather than the creator wiring
  up an `onClick`. (`.__popup` and `.__form` are the only two class names that exist for
  this reason — every other class was removed because nothing queried it.)
- **`caller`**: the popup (or element) responsible for opening another popup. Used for (a)
  cascading the new popup's position off the caller's actual position, and (b) letting
  `popup-save-btn`/`popup-delete-btn` refresh the caller popup after a change. Always pass
  the real originating `.__popup`, not a stand-in container element.
- **No CSS.** Everything is inline via `fn.element.create`'s `style` option, set directly
  at the point an element is created. Hover states use the `hoverStyle` option
  (mouseenter/mouseleave toggle it against `style`) instead of `:hover`. Don't reintroduce
  a `<style>` block or CSS classes for styling.
- **No comments.** If a name needs a comment to explain it, rename it instead.
- **English only** for UI text, titles, labels, and log output.
- **CRUD verbs**: `fn.data.select/insert/update/delete` follow SQL naming. `key` (the
  localStorage/resource key) is always camelCase. A popup's own lifecycle methods
  (`popup.refresh()`, `popup.close()`) are named after the header button that triggers them
  ("Refresh", "Close"), not the CRUD set — they're UI actions on one instance, not table
  operations.
- **File order**: within each IIFE, order definitions from most foundational to most
  composed. Core IIFE: `fn.log` → `fn.element.*` → `fn.component.*` → `fn.localStorage.*` /
  `fn.data.*` → `fn.ajax`. Layouts IIFE: leaf button layouts → `popup-buttons` → `popup` →
  `form` → `list` → `menu` → `devtool` (always last — it's the most composed piece and the
  bookmarklet's entry point). New layouts should slot in based on what they depend on, not
  just appended at the end.
- **Component lifecycle**: `popup` is the only layout tracked in `fn.component.data` and torn
  down via its own `popup.close()` — it's the only unit ever independently created/removed (every
  other component lives and dies with its enclosing popup, so `el.remove()`/`child.remove()`
  cascading through the DOM is enough for them; tracking them individually only produced stale
  entries once their popup closed without walking each descendant). `fn.component.create` itself
  is a plain dispatcher (look up the layout, run it, append to `parent` if given) — the `popup`
  layout registers itself into `fn.component.data.popup` as the last step of its own `value`
  function, so a layout that returns another component's element directly (e.g. `devtool`
  returning a `popup`) can't cause double-registration: the popup only ever registers itself
  once, when it's actually built.
- **Logging**: call `fn.log(scope, action, ...details)` from `fn.data.*` and the `popup` layout
  (on self-registering via `create`, and on tearing down via `popup.close()`) so behavior is
  visible in the console while testing new features. Keep the `[fn.<scope>] <action>` shape.

## Workflow for changes

1. Implement the change.
2. `node --check fn.js` to catch syntax errors.
3. Verify in an actual browser (Playwright), not just by reading the diff — load `fn.js`
   into a test page, drive the interaction, and check the result (DOM state, localStorage,
   screenshots). This is a plain script with no test suite, so this is the only real
   verification available.
4. Commit and push to the working branch.
5. Only create/merge a PR when asked.
6. If the branch's last PR was already merged, restart the branch from the latest `main`
   before adding new commits — don't stack new work on already-merged history.
