# AAPC Website

Website for **AAPC — Asian Awareness & Perspective Connections**, an online magazine club sharing the Asian perspective through creative media.

## Run it locally

```bash
npm install
npm start
```

Then open http://localhost:3000.

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
