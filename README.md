# devtool.simple

A single-file bookmarklet devtool (`fn.js`) that adds a floating popup UI to any page for managing simple localStorage-backed data (memos, bookmarks, etc.).

## Setup

Serve `fn.js` from a local server, e.g. with a static file server at `http://127.0.0.1:5500/`.

## Install the bookmarklet

Create a new browser bookmark, name it whatever you like (e.g. "DevTool"), and set its URL to:

```
javascript:(function(){if(window.fn&&window.fn.devtool){fn.devtool.open();}else{var s=document.createElement('script');s.src='http://127.0.0.1:5500/fn.js?t='+Date.now();document.body.appendChild(s);}})();
```

Replace `http://127.0.0.1:5500/` with wherever you're serving `fn.js` from.

Clicking the bookmarklet:
- Injects `fn.js` into the current page if it isn't loaded yet, which auto-starts the devtool (creates the gear button).
- If it's already loaded, just opens the devtool popup directly instead of re-injecting the script.

The `?t=...` cache-busting query param means each click always fetches the latest `fn.js`, which is handy while actively editing it.

## Usage

Once started, a gear button (⚙) appears in the bottom-right corner of the page. Click it, or press **Alt+`**, to open the DevTool popup, which lists your data resources. Press **Escape** to close the frontmost popup (press it repeatedly to close several):

- **Memo** — free-form notes (name + content).
- **Sheet** — a small spreadsheet-like table (name + a 3x3 grid of text cells to start). Click a cell to select it, drag to select a rectangular range, Ctrl+C/Ctrl+V copy and paste that range as tab/newline-separated text (Excel's clipboard format) — pasting a bigger block than the current sheet grows it to fit, anchored at the top-left of your selection. Cell contents containing tabs or newlines aren't supported (no quote-escaping), same as a quick paste from Excel without special characters.
- **Bookmark** — saved links with a Run button that opens the URL in a new tab.
- **Reminder** — a title and a date/time; once that time passes, a browser notification fires. This only works while the tab the devtool is running in stays open (no service worker or background process), and the notification permission/data are both scoped to whatever site you're on when you create the reminder, same as every other resource here.
- **Capture** — press **Alt+1** to enter capture mode: hover the host page to highlight elements, click one to grab every `input`/`textarea`/`select` inside it (checkbox/radio via `.checked`, everything else via `.value`) as a plain array, in DOM order, saved as a new Capture row. Escape cancels capture mode without saving. Clicking directly on a single field widens the search to its closest `<form>` (or parent) so you still get its siblings, not just that one field. Press **Alt+2** to paste it back: same hover/click targeting, but it fills in fields positionally (1st field gets the array's 1st value, and so on) from the most recently saved Capture row instead of reading them — the source and target don't need matching `name`/`id`, just the same field order. Extra fields on either side are left alone.
- **Request** — a small Postman-style API client: method, URL, query params, headers, and bearer/basic auth, all as JSON fields. Run executes the request and shows the response in a popup, recording it into the separate **History** resource (each row references its Request by id); History keeps the last 20 runs (success/error) per request. History has no entry of its own in this menu — its data only shows up through a Request's own History button, newest-first.

Every popup can be dragged by its header and resized from its corner. List popups with a 🔍 button support a text search that filters visible rows. The gear button and every popup auto-detect the host page's highest z-index once, when the devtool starts, so they float above whatever the host page had at that point.

Memo, Bookmark, Reminder, Capture, Code, Request, and History are built in and can't be deleted from the Resource list (no Delete button when editing them) — they self-heal even if removed some other way (e.g. an Import that omits them). Resource and Setting's own shapes aren't stored as data at all — they're fixed in code, so there's nothing to delete or heal there, and neither appears as a row in the Resource list. Resources you create yourself stay freely deletable.

The ⚙ button in the DevTool popup's own header opens **Setting**: default popup scale/opacity (popups always size to their content), Resources (define your own data types — a name, storage key, and a JSON column spec; every resource opens as a list, and Columns can supply custom render functions for list cells or form fields, or reference another resource's rows by id) and Codes (lookup values like HTTP methods and auth types that populate select inputs elsewhere) for schema management, Generate sample data (repopulate the sample Memo/Bookmark/Request rows on demand), Export (download all data as JSON) / Import (restore from a JSON file, overwriting everything) for backups, and Reset (wipe all data back to the seeded samples).

### Debugging

Ctrl+Click a list row logs that row's underlying data to the console instead of opening it for editing. Ctrl+Click a popup's header logs the options it was created with, instead of bringing it to the front.
