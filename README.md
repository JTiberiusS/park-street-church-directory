# Park Street Baptist Church Directory

A standalone, responsive member directory that reads live data from the church's existing Google Apps Script CSV endpoint. It is designed for GitHub Pages and keeps the monthly Breeze workflow unchanged.

## Project structure

- `index.html` — page structure and accessible dialog markup
- `styles.css` — layout, colors, responsive styles, and animations
- `directory.js` — CSV loading, Breeze column mapping, privacy rules, search, household relationships, and profiles
- `00 Inbox/Directory0426.html` — the original single-file directory, retained as a reference

No build process or package installation is required.

## Monthly directory update

1. Export the directory from Breeze using the same export and column layout as before.
2. Replace or update the data in the Google Spreadsheet connected to the directory.
3. Confirm the Google Apps Script still returns the spreadsheet as CSV.
4. Open the directory site and refresh it. The site reads the current CSV automatically; no website files need to change.

Keep the Breeze spreadsheet columns in their existing order. The numeric mappings near the top of `directory.js` correspond to that exact layout. Changing the order without updating those mappings can show the wrong data or bypass intended visibility settings.

## Data and privacy behavior

The site uses the existing `Show In Directory`, `Show Email`, and `Show Phone` values. A member appears only when directory visibility is set to **Yes** and a non-placeholder photo is present. Email and phone links appear only when their respective visibility value is **Yes**.

Family IDs and household roles provide household navigation, relationship labels, and parent names for children. The browser receives the complete CSV response, so the Google Apps Script should expose only fields appropriate for directory users. If access must be limited to church members, add an authentication or access-control layer before treating the directory as private.

## Google Apps Script CSV

The deployed Apps Script URL is stored in `directory.js` as `csvUrl`. The browser requests that URL each time the directory loads. The Apps Script deployment must allow the intended visitors to access it and should return CSV with the Breeze header row followed by member rows.

If the Apps Script deployment URL changes, replace only the `csvUrl` value. Do not change the `COL` mappings unless the spreadsheet column order has also changed.

## Publish with GitHub Pages

1. Create a GitHub repository for the directory.
2. Add `index.html`, `styles.css`, `directory.js`, and `README.md` to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the main branch and the root folder, then save.
6. GitHub will provide a Pages address after the first deployment finishes.

Because this is a member directory, decide whether a publicly accessible GitHub Pages site is appropriate before publishing. GitHub Pages does not provide built-in member authentication.

## Connect a custom domain

In **Settings → Pages**, enter a domain such as `directory.parkstreetbc.org`. At the DNS provider, add the DNS record GitHub requests—normally a `CNAME` from `directory` to the repository's `github.io` hostname. Wait for DNS verification, then enable **Enforce HTTPS**.

A subdomain is the simplest option. Serving at `parkstreetbc.org/directory` generally requires the main church website or a reverse proxy to own that path.

## Deploy future website changes

Edit the files locally, test them, then commit and push to the branch configured for Pages. GitHub Pages redeploys automatically. Routine monthly Breeze/Spreadsheet updates do not require a website deployment.

## Local preview

Opening `index.html` directly may work, but some browsers restrict network requests from local files. For the most accurate preview, serve the folder with any simple local web server and visit its local address. Check the browser console if the Apps Script rejects requests; its response must permit the directory site's origin.

## Optional future enhancements

These are intentionally not included in the initial refactor:

1. A household view that shows one family card before individual profiles.
2. “New Member” badges calculated from the existing Member Since field.
3. Ministry, class, staff, pastor, or deacon badges when those fields are available and approved for display.
4. A print-friendly household directory with privacy-aware contact details.
5. Passwordless sign-in or a private member portal before exposing sensitive information publicly.
6. Optional birthdays that omit the birth year and require explicit visibility consent.
7. A light/dark appearance setting saved on each device.
8. Optimized photo thumbnails or an image proxy for faster loading on mobile connections.
9. Installable Progressive Web App support for quick access from a phone home screen.
10. An optional short bio or favorite Scripture field managed in the spreadsheet.
