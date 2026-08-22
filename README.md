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

Once started, a gear button (⚙) appears in the bottom-right corner of the page. Click it, or press `Ctrl+\`` , to open the DevTool popup.
