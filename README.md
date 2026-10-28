# AAPC Website

Website for **AAPC — Asian Awareness & Perspective Connections**, an online magazine club sharing the Asian perspective through creative media.

## Run it locally

```bash
npm install
npm start
```

Then open http://localhost:3000.

## Live site (GitHub Pages)

https://chiasmi-ui.github.io/AAPC/ — redeploys automatically on every push to `main` (`.github/workflows/pages.yml`).

GitHub Pages can't run the Express backend, so the deploy is a **static build** (`npm run build:static` → `_site/`): the browser reads `data/*.json` directly using the same query code as the server (`public/js/content.js`). Forms (suggestions, newsletter, feedback, topic requests) are sent straight to the **AAPC Website Responses** Google Sheet (owned by chiasmi@udel.edu), one tab per form, through the Apps Script in `google-apps-script/Code.gs`. Its web app URL is `sheetsEndpoint` in `data/site.json`; if you change the script, use Deploy → Manage deployments → edit → New version so the URL stays the same.

## How it's organized

| Path | What it is |
| --- | --- |
| `server.js` | Express server: serves `public/` and the JSON API |
| `data/*.json` | Site content — edit these to add articles, events, magazines, eboard members, past years |
| `storage/` | Form submissions (feedback, topic requests, newsletter emails). Git-ignored. |
| `public/` | Frontend pages, styles (`css/styles.css`) and scripts (`js/`) |

### Adding content

- **Article:** add an entry to `data/articles.json`. `publishDate` in the future = it stays hidden and drives the homepage article countdown until that time. Leave `mainGraphic` as `null` to get a placeholder, or point it at an image in `public/img/`. `images` is optional.
- **Event:** add to `data/events.json` (`type` is `GBM`, `Deadline`, `Tabling` or `Release`).
- **Magazine:** add to `data/magazines.json`. The next unreleased issue powers the big magazine countdown.

### Paywall (placeholder)

Paywalled magazines unlock with an access code (`MAGAZINE_ACCESS_CODE` env var, default `AAPC-PREVIEW`). This is a stand-in until real payments (e.g. Stripe) are added. Set `TOKEN_SECRET` to a random string in production.

## API

`GET /api/articles?year=&month=&topic=&featured=` · `GET /api/articles/:id` · `GET /api/archive` · `GET /api/events?year=&month=` · `GET /api/countdowns` · `GET /api/magazines` · `POST /api/magazines/unlock` · `GET /api/magazines/:id/read` · `POST /api/feedback` · `POST /api/topic-requests` · `POST /api/newsletter` · `GET /api/site` · `GET /api/eboard` · `GET /api/years`
