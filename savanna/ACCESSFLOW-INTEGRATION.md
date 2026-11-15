# ACCESSFLOW in the Savanna static pages

Source: https://github.com/alx-africa/Savanna-static-pages at commit `9e83ac7` ("cleanup"), vendored on 2026-11-15.

## Original files
**No original starter file was modified** (`index.html`, `pages/homepage-*.html`, `pages/concept-with-navigation.html`,
everything in `assets/`). The repository keeps them byte-identical (`savanna/** -text` in `.gitattributes`).

## Added files
| File | Purpose |
|---|---|
| `pages/signup.html` | Accessible registration + guided profile (`<db-signup view="signup">`) |
| `pages/profile.html` | Profile editing (`<db-signup view="profile">`) |
| `pages/jobs.html` | Career gateway: job list, details and application on the same form engine (`<db-signup view="jobs">`) |
| `ACCESSFLOW-INTEGRATION.md` | This note |

Each added page uses the starter's own stylesheets and scripts (Bootstrap bundle, `static-page.js`) unchanged, and adds
exactly one script tag plus the `<db-signup>` element. Navigation between the three pages uses the Savanna sidebar markup.

Because the starter's `index.html` is not modified, open the new pages directly: `http://localhost:5510/pages/signup.html`.

## Run
```bash
# ACCESSFLOW in production mode on :8081 (see the main README), then:
python3 -m http.server 5510 -d savanna
```
The origin `http://localhost:5510` is registered for the `pk_savanna_local_demo` integration (migration V4), so no key is
needed in the markup. For a real Savanna deployment, register Savanna's production origin(s) instead.
