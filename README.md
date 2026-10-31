# Pickleball Court Spot

Static directory of pickleball courts in Canada and Australia, built for [pickleballcourtspot.com](https://pickleballcourtspot.com).

## How it works

- `data/cities.json` - launch cities (slug, name, region, country, hero image)
- `data/venues.json` - one entry per venue. Unconfirmed fields stay `null` and show as "Not confirmed" on the site.
- `build.js` - zero-dependency generator. Writes every page, `sitemap.xml` and `robots.txt` into `dist/`.
- `src/` - stylesheet, script, favicon and optimised WebP images.

```bash
node build.js        # build into ./dist
npm run preview      # build and serve locally
```

## Indexing rule

A city page (and its venue pages) is set to `noindex` and left out of the sitemap until the city has at least 5 venues (`MIN_VENUES_TO_INDEX` in `build.js`). This keeps thin pages out of Google while coverage grows.

## Venue fields

| Field | Values |
|---|---|
| `setting` | `indoor`, `outdoor`, `indoor-outdoor`, `undercover`, or `null` |
| `access` | `free`, `membership`, `pay`, `book` (online booking), or `null` |
| `courts`, `surface`, `website`, `hours` | value or `null` |
| `source`, `lastChecked` | where the details came from and when they were checked |

## Deploy

Vercel picks up `vercel.json`: build command `node build.js`, output directory `dist`.
