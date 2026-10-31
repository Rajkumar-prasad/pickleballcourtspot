// Static site generator for pickleballcourtspot.com
// Usage: node build.js  ->  writes the site into ./dist
const fs = require('fs');
const path = require('path');

const SITE = {
  name: 'Pickleball Court Spot',
  url: 'https://pickleballcourtspot.com',
  email: 'hello@pickleballcourtspot.com',
  updated: '2026-10-31',
};
// City pages (and their venue pages) stay out of Google's index until they
// have enough listings to be genuinely useful. Raise coverage, then they go live.
const MIN_VENUES_TO_INDEX = 5;

const COUNTRIES = {
  canada: { slug: 'canada', name: 'Canada', code: 'CA', image: 'night-play' },
  australia: { slug: 'australia', name: 'Australia', code: 'AU', image: 'players-sunset' },
};

const IMG_DIMS = {
  'players-sunset': [1600, 900], 'paddle-net': [1228, 750], 'paddle-court': [1260, 738],
  'player-serve': [1125, 750], 'night-play': [1125, 750], 'park-courts': [1125, 750],
};

const cities = JSON.parse(fs.readFileSync('data/cities.json', 'utf8'));
const venues = JSON.parse(fs.readFileSync('data/venues.json', 'utf8'));
const DIST = 'dist';

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const listJoin = (arr) => arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];

function img(name, alt, { cls = '', sizes = '100vw', eager = false } = {}) {
  const [w, h] = IMG_DIMS[name];
  return `<img class="${cls}" src="/img/${name}.webp" srcset="/img/${name}-sm.webp 700w, /img/${name}.webp ${w}w" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

const SETTING = { indoor: 'Indoor', outdoor: 'Outdoor', 'indoor-outdoor': 'Indoor + outdoor', undercover: 'Undercover' };
const ACCESS = { membership: 'Membership', pay: 'Pay to play', free: 'Free to play', book: 'Online booking' };
const isIndoor = (v) => v.setting === 'indoor' || v.setting === 'indoor-outdoor' || v.setting === 'undercover';
const isOutdoor = (v) => v.setting === 'outdoor' || v.setting === 'indoor-outdoor';

const cityOf = (v) => cities.find((c) => c.slug === v.city);
const venuesIn = (c) => venues.filter((v) => v.city === c.slug).sort((a, b) => a.name.localeCompare(b.name));
const cityUrl = (c) => `/${c.country}/${c.slug}/`;
const venueUrl = (v) => `/${cityOf(v).country}/${v.city}/${v.slug}/`;
const indexable = (c) => venuesIn(c).length >= MIN_VENUES_TO_INDEX;

function cityStats(list) {
  return {
    venues: list.length,
    courts: list.reduce((s, v) => s + (v.courts || 0), 0),
    indoor: list.filter(isIndoor).length,
    outdoor: list.filter(isOutdoor).length,
    free: list.filter((v) => v.access === 'free').length,
  };
}

function tagsFor(v) {
  const t = [];
  if (isIndoor(v)) t.push(`<span class="tag in">${SETTING[v.setting]}</span>`);
  else if (v.setting === 'outdoor') t.push('<span class="tag out">Outdoor</span>');
  if (v.courts) t.push(`<span class="tag">${plural(v.courts, 'court', 'courts')}</span>`);
  if (v.access === 'free') t.push('<span class="tag free">Free</span>');
  else if (v.access) t.push(`<span class="tag">${ACCESS[v.access]}</span>`);
  return t.join('');
}

function venueSummary(v) {
  const c = cityOf(v);
  const kind = v.setting ? SETTING[v.setting].toLowerCase() + ' ' : '';
  let s = `${v.name} is ${/^[aeiou]/i.test(kind || 'p') ? 'an' : 'a'} ${kind}pickleball venue in ${v.area}, ${c.name}`;
  s += v.courts ? ` with ${plural(v.courts, 'court', 'courts')}.` : '.';
  if (v.access === 'free') s += ' It is listed as free to play.';
  if (v.access === 'membership') s += ' Play is through a membership.';
  if (v.access === 'pay') s += ' It is pay to play.';
  if (v.access === 'book') s += ' Courts and sessions are booked online through the venue.';
  return s;
}

const mapsLink = (v) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name + ', ' + v.address)}`;

// ---------- icons ----------
const ICON = {
  logo: `<svg width="40" height="40" viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="3" width="22" height="28" rx="11" transform="rotate(-30 20 17)" fill="#5a9a4a"/><rect x="21" y="27" width="6" height="16" rx="3" transform="rotate(-30 24 35)" fill="#16362c"/><circle cx="38" cy="36" r="8" fill="#d8ef4a" stroke="#16362c" stroke-width="2"/><circle cx="36" cy="34" r="1.3" fill="#16362c"/><circle cx="40" cy="38" r="1.3" fill="#16362c"/><circle cx="40" cy="33.5" r="1.3" fill="#16362c"/></svg>`,
  pin: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>`,
  court: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 12h18M12 4v5M12 15v5"/></svg>`,
  city: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 21h18M5 21V9l5-3v15M10 21V4l9 4v13M13 10h3M13 14h3M7 12h1M7 16h1"/></svg>`,
  globe: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>`,
  check: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#467d39" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>`,
  book: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#467d39" stroke-width="2"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/></svg>`,
};

// ---------- layout ----------
function layout({ title, description, url, body, schema = [], noindex = false, image = '/img/og.jpg', nav = '' }) {
  const canonical = SITE.url + url;
  const navLink = (href, label) => `<a href="${href}"${nav === href ? ' aria-current="page"' : ''}>${label}</a>`;
  const auCities = cities.filter((c) => c.country === 'australia');
  const caCities = cities.filter((c) => c.country === 'canada');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE.url}${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#16362c">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&family=Marcellus&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
${schema.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="topbar"><div class="wrap"><span>Indoor and outdoor pickleball courts in Canada and Australia</span><span class="hide-sm"><a href="mailto:${SITE.email}">${SITE.email}</a></span></div></div>
<header class="site-header"><div class="wrap">
  <a class="logo" href="/">${ICON.logo}<span>Pickleball Court Spot<small>Find a court. Get playing.</small></span></a>
  <button class="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>
  <nav class="nav" id="nav" aria-label="Main">
    ${navLink('/', 'Home')}${navLink('/australia/', 'Australia')}${navLink('/canada/', 'Canada')}${navLink('/guides/how-to-start-playing-pickleball/', 'Beginner Guide')}${navLink('/about/', 'About')}
    <a class="btn" href="/contact/">Suggest a court</a>
  </nav>
</div></header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="foot-top"><div class="wrap">
    <a class="logo" href="/">${ICON.logo}<span>Pickleball Court Spot</span></a>
    <p>An independent directory of places to play pickleball. Venue details are checked against public sources and dated so you know how fresh they are.</p>
  </div></div>
  <div class="wrap foot-cols">
    <div><h4>About the directory</h4><p>We list indoor and outdoor pickleball venues with addresses, court counts and booking links. Spotted something out of date? <a href="/contact/" style="color:#d8ef4a">Tell us</a>.</p></div>
    <div><h4>Australia</h4><ul>${auCities.map((c) => `<li><a href="${cityUrl(c)}">Pickleball in ${c.name}</a></li>`).join('')}</ul></div>
    <div><h4>Canada</h4><ul>${caCities.map((c) => `<li><a href="${cityUrl(c)}">Pickleball in ${c.name}</a></li>`).join('')}</ul></div>
    <div><h4>Site</h4><ul><li><a href="/guides/how-to-start-playing-pickleball/">Beginner guide</a></li><li><a href="/about/">About us</a></li><li><a href="/contact/">Contact</a></li><li><a href="/privacy-policy/">Privacy policy</a></li></ul></div>
  </div>
  <div class="copy">&copy; ${new Date(SITE.updated).getFullYear()} Pickleball Court Spot. Venue data last reviewed ${fmtDate(SITE.updated)}.</div>
</footer>
<script src="/main.js" defer></script>
</body>
</html>`;
}

const curve = `<svg class="hero-curve" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 90V40C240 85 480 95 720 70S1200 5 1440 30v60z" fill="#fff"/></svg>`;
const curveSoft = curve.replace('#fff', '#f1f5ef');

function crumbs(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb">${items.map((it, i) => i < items.length - 1 ? `<a href="${it.url}">${esc(it.name)}</a> / ` : `<span>${esc(it.name)}</span>`).join('')}</nav>`;
}
function crumbSchema(items) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: SITE.url + it.url })) };
}
function faqBlock(faqs) {
  return `<div class="faq">${faqs.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><div class="ans">${f.a}</div></details>`).join('')}</div>`;
}
function faqSchema(faqs) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') } })) };
}

function cityCard(c) {
  const s = cityStats(venuesIn(c));
  return `<a class="city" href="${cityUrl(c)}">
    <div class="ph">${img(c.image, `Pickleball in ${c.name}`, { sizes: '(max-width:560px) 100vw, (max-width:1000px) 50vw, 300px' })}<span class="badge">${s.venues}</span></div>
    <div class="body"><h4>${c.name}</h4><p>${c.region} &middot; ${plural(s.venues, 'venue', 'venues')}${s.indoor ? `, ${s.indoor} with indoor courts` : ''}</p><span class="more">View courts &rarr;</span></div>
  </a>`;
}

function venueCard(v) {
  const filters = [isIndoor(v) ? 'indoor' : '', isOutdoor(v) ? 'outdoor' : '', v.access === 'free' ? 'free' : ''].filter(Boolean).join(' ');
  return `<article class="venue" data-tags="${filters}">
    <h3><a href="${venueUrl(v)}">${esc(v.name)}</a></h3>
    <div class="addr">${esc(v.address)}</div>
    <div class="tags">${tagsFor(v)}</div>
    <div class="links"><a href="${venueUrl(v)}">Details</a>${v.website ? `<a href="${esc(v.website)}" rel="nofollow noopener" target="_blank">Book / website</a>` : ''}</div>
  </article>`;
}

// ---------- pages ----------
const pages = [];
const add = (url, html, { index = true } = {}) => pages.push({ url, html, index });

// Home
(function home() {
  const all = cityStats(venues);
  const auCities = cities.filter((c) => c.country === 'australia');
  const caCities = cities.filter((c) => c.country === 'canada');
  const faqs = [
    { q: 'What is Pickleball Court Spot?', a: '<p>An independent directory of places to play pickleball in Canada and Australia. Each listing shows the address, whether courts are indoor or outdoor, the number of courts where we could confirm it, and a link to book or learn more.</p>' },
    { q: 'How do you check venue details?', a: '<p>We collect details from venue websites, council and league pages and other public listings, then record the date each venue was last checked. If two sources disagree, we leave that detail blank rather than guess.</p>' },
    { q: 'Can I add or correct a court?', a: '<p>Yes. Use the <a href="/contact/">suggest a court</a> page to send us a new venue or a correction. Listings are free.</p>' },
    { q: 'Which cities do you cover?', a: `<p>We currently cover ${listJoin(auCities.map((c) => c.name))} in Australia, and ${listJoin(caCities.map((c) => c.name))} in Canada. More cities are added as we verify their venues.</p>` },
    { q: 'Is this site connected to a pickleball association?', a: '<p>No. We are independent and not affiliated with any governing body, league or venue. For official rules and club programs, check your national or state association.</p>' },
  ];
  const body = `
<section class="hero">
  ${img('players-sunset', 'Two players with paddles and balls on an outdoor pickleball court at sunset', { cls: 'hero-img', eager: true })}
  <div class="wrap">
    <span class="eyebrow">Find your next game</span>
    <h1>Pickleball courts near you, all in one place</h1>
    <p class="lead">Indoor halls, outdoor courts and drop-in sessions across ${cities.length} cities in Canada and Australia, with addresses, court counts and booking links.</p>
    <form class="finder" id="finder" action="/" onsubmit="return false">
      <label class="skip" for="city-select">Choose a city</label>
      <select id="city-select"><option value="">Choose your city</option>
        <optgroup label="Australia">${auCities.map((c) => `<option value="${cityUrl(c)}">${c.name}, ${c.regionShort}</option>`).join('')}</optgroup>
        <optgroup label="Canada">${caCities.map((c) => `<option value="${cityUrl(c)}">${c.name}, ${c.regionShort}</option>`).join('')}</optgroup>
      </select>
      <button class="btn lime" type="submit">Find courts</button>
    </form>
  </div>
  ${curve}
</section>

<section class="section center">
  <div class="wrap">
    <span class="eyebrow">Ways to play</span>
    <h2>Find the right court for <br>how you like to play</h2>
    <div class="ways">
      <a class="way" href="#cities">${img('paddle-net', 'Paddle and ball beside the net on an indoor court', { sizes: '260px' })}<h3>Indoor Courts</h3><p>Dedicated halls and sports centres for play in any weather.</p><span class="arrow">&rarr;</span></a>
      <a class="way" href="#cities">${img('park-courts', 'Players on outdoor public courts in a park', { sizes: '260px' })}<h3>Outdoor Courts</h3><p>Park and club courts, including free public courts.</p><span class="arrow">&rarr;</span></a>
      <a class="way" href="#cities">${img('night-play', 'Doubles game under lights in the evening', { sizes: '260px' })}<h3>Evening Play</h3><p>Venues with late sessions so you can play after work.</p><span class="arrow">&rarr;</span></a>
      <a class="way" href="/guides/how-to-start-playing-pickleball/">${img('player-serve', 'New player hitting a pickleball with a paddle', { sizes: '260px' })}<h3>Beginners</h3><p>What to bring, the basic rules and how to book a first game.</p><span class="arrow">&rarr;</span></a>
    </div>
  </div>
</section>

<section class="section soft">
  <div class="wrap split">
    <div>
      <span class="eyebrow">About the directory</span>
      <h2>Court details you can actually rely on</h2>
      <p>Most court finders list a name and a pin on a map. We go a step further and record the details that decide whether a venue suits you, and we date every listing so you know how current it is.</p>
      <ul class="checks">
        <li>Full street addresses with one-tap directions</li>
        <li>Indoor, outdoor or both, plus court counts where confirmed</li>
        <li>Free, membership or online booking, with a link to the venue</li>
        <li>No guessing: unconfirmed details are left blank</li>
      </ul>
      <a class="btn" href="/about/">How we check listings</a>
    </div>
    <div class="collage">
      <span class="ring"></span><span class="dots"></span>
      ${img('night-play', 'Friends playing doubles pickleball under evening lights', { cls: 'main', sizes: '(max-width:860px) 80vw, 460px' })}
      ${img('paddle-court', 'Pickleball paddle and ball lying on a blue court', { cls: 'bubble', sizes: '240px' })}
    </div>
  </div>
</section>

<section class="section" id="cities">
  <div class="wrap">
    <div class="center"><span class="eyebrow">Browse by city</span><h2>Where do you want to play?</h2></div>
    <div class="country-head"><h3>Australia</h3><a href="/australia/">All Australian cities &rarr;</a></div>
    <div class="cities">${auCities.map(cityCard).join('')}</div>
    <div class="country-head"><h3>Canada</h3><a href="/canada/">All Canadian cities &rarr;</a></div>
    <div class="cities">${caCities.map(cityCard).join('')}</div>
  </div>
</section>

<section class="stats" aria-label="Directory in numbers">
  <div class="wrap">
    <div class="stat"><span class="ico">${ICON.pin}</span><div><strong>${all.venues}</strong><span>Venues listed</span></div></div>
    <div class="stat"><span class="ico">${ICON.court}</span><div><strong>${all.courts}+</strong><span>Courts confirmed</span></div></div>
    <div class="stat"><span class="ico">${ICON.city}</span><div><strong>${cities.length}</strong><span>Cities covered</span></div></div>
    <div class="stat"><span class="ico">${ICON.globe}</span><div><strong>${Object.keys(COUNTRIES).length}</strong><span>Countries</span></div></div>
  </div>
</section>

<section class="section">
  <div class="wrap split rev">
    <div class="portrait"><span class="ring"></span>${img('player-serve', 'Smiling player hitting a pickleball', { sizes: '(max-width:860px) 100vw, 520px' })}</div>
    <div>
      <span class="eyebrow">New to pickleball?</span>
      <h2>Start playing in your first week</h2>
      <p>Pickleball is easy to pick up. Most venues lend paddles and run beginner or social sessions, so all you really need is comfortable court shoes and a booking.</p>
      <div class="feature"><span class="ico">${ICON.check}</span><div><h4>Pick a beginner-friendly session</h4><p>Social and come-and-try sessions mix you in with other new players.</p></div></div>
      <div class="feature"><span class="ico">${ICON.book}</span><div><h4>Learn the basics in 5 minutes</h4><p>Serving, the two-bounce rule and the kitchen, explained simply.</p></div></div>
      <a class="btn" href="/guides/how-to-start-playing-pickleball/">Read the beginner guide</a>
    </div>
  </div>
</section>

<section class="cta">
  <span class="pattern"></span>
  <div class="wrap">
    <div>
      <span class="eyebrow" style="color:#d8ef4a">Help the community</span>
      <h2>Know a court we are missing?</h2>
      <p>Run a venue or play somewhere that is not listed yet? Send us the details and we will check and add it, free of charge.</p>
      <div class="actions"><a class="btn lime" href="/contact/">Suggest a court</a><a class="btn ghost" href="/about/">How listings work</a></div>
    </div>
    <div class="pic">${img('paddle-net', 'Pickleball paddle leaning on the net', { sizes: '(max-width:860px) 100vw, 480px' })}</div>
  </div>
</section>

<section class="section soft">
  <div class="wrap split">
    <div>
      <span class="eyebrow">FAQs</span>
      <h2>Frequently asked questions</h2>
      ${faqBlock(faqs)}
    </div>
    <div class="collage">
      <span class="ring"></span>
      ${img('park-courts', 'Players on public outdoor pickleball courts', { cls: 'main', sizes: '(max-width:860px) 80vw, 460px' })}
    </div>
  </div>
</section>`;
  add('/', layout({
    title: 'Pickleball Courts Near You in Canada & Australia | Pickleball Court Spot',
    description: `Find indoor and outdoor pickleball courts in ${listJoin(cities.map((c) => c.name))}. Addresses, court counts and booking links, checked and dated.`,
    url: '/', body, nav: '/',
    schema: [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.url + '/' },
      { '@context': 'https://schema.org', '@type': 'Organization', name: SITE.name, url: SITE.url + '/', logo: SITE.url + '/favicon.svg', email: SITE.email },
      faqSchema(faqs),
    ],
  }));
})();

// Country pages
for (const country of Object.values(COUNTRIES)) {
  const list = cities.filter((c) => c.country === country.slug);
  const vs = venues.filter((v) => cityOf(v).country === country.slug);
  const s = cityStats(vs);
  const trail = [{ name: 'Home', url: '/' }, { name: country.name, url: `/${country.slug}/` }];
  const anyIndexable = list.some(indexable);
  const body = `
<section class="page-hero">
  ${img(country.image, `Pickleball in ${country.name}`, { cls: 'hero-img', eager: true })}
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(14,38,30,.9),rgba(14,38,30,.45))"></div>
  <div class="wrap">
    ${crumbs(trail)}
    <span class="eyebrow" style="color:#d8ef4a">${country.name}</span>
    <h1>Pickleball courts in ${country.name}</h1>
    <p>${plural(s.venues, 'venue', 'venues')} across ${plural(list.length, 'city', 'cities')}, including ${s.indoor} with indoor courts. Choose a city to see addresses, court counts and booking links.</p>
  </div>
  ${curve}
</section>
<section class="section"><div class="wrap">
  <div class="cities">${list.map(cityCard).join('')}</div>
</div></section>`;
  add(`/${country.slug}/`, layout({
    title: `Pickleball Courts in ${country.name} by City | Pickleball Court Spot`,
    description: `Browse ${s.venues} pickleball venues in ${listJoin(list.map((c) => c.name))}. Indoor and outdoor courts with addresses and booking links.`,
    url: `/${country.slug}/`, body, nav: `/${country.slug}/`, noindex: !anyIndexable,
    schema: [crumbSchema(trail)],
  }), { index: anyIndexable });
}

// City pages
for (const c of cities) {
  const country = COUNTRIES[c.country];
  const list = venuesIn(c);
  const s = cityStats(list);
  const ok = indexable(c);
  const trail = [{ name: 'Home', url: '/' }, { name: country.name, url: `/${country.slug}/` }, { name: c.name, url: cityUrl(c) }];
  const indoor = list.filter(isIndoor);
  const outdoor = list.filter(isOutdoor);
  const free = list.filter((v) => v.access === 'free');
  const link = (v) => `<a href="${venueUrl(v)}">${esc(v.name)}</a> (${esc(v.area)})`;
  const faqs = [
    { q: `Where can I play indoor pickleball in ${c.name}?`, a: indoor.length ? `<p>We list ${plural(indoor.length, 'venue', 'venues')} with indoor or covered courts in and around ${c.name}: ${listJoin(indoor.map(link))}.</p>` : `<p>We have not confirmed any indoor venues in ${c.name} yet. <a href="/contact/">Suggest one</a>.</p>` },
    { q: `Are there outdoor pickleball courts in ${c.name}?`, a: outdoor.length ? `<p>Yes. Outdoor courts are listed at ${listJoin(outdoor.map(link))}.</p>` : `<p>None of the ${c.name} venues we have checked so far are confirmed as outdoor. We are adding public park courts as we verify them.</p>` },
    { q: `Is there free pickleball in ${c.name}?`, a: free.length ? `<p>${listJoin(free.map(link))} ${free.length === 1 ? 'is' : 'are'} listed as free to play. Free courts are usually first come, first served, so check the venue before you go.</p>` : `<p>We have not confirmed a free venue in ${c.name} yet. Many councils and community centres run low-cost drop-in sessions, so it is worth checking your local centre.</p>` },
    { q: `How do I book a court in ${c.name}?`, a: '<p>Most venues listed here take bookings online. Open a listing and use the booking or website link to see current session times and prices, which change often.</p>' },
  ];
  const intro = `We list ${plural(s.venues, 'pickleball venue', 'pickleball venues')} in and around ${c.name}, ${c.region}${s.courts ? `, with at least ${s.courts} courts confirmed` : ''}. ${s.indoor ? `${s.indoor} ${s.indoor === 1 ? 'has' : 'have'} indoor or covered courts` : 'Indoor status is still being confirmed'}${s.outdoor ? ` and ${s.outdoor} ${s.outdoor === 1 ? 'has' : 'have'} outdoor courts` : ''}.`;
  const body = `
<section class="page-hero">
  ${img(c.image, `Pickleball in ${c.name}`, { cls: 'hero-img', eager: true })}
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(14,38,30,.9),rgba(14,38,30,.45))"></div>
  <div class="wrap">
    ${crumbs(trail)}
    <span class="eyebrow" style="color:#d8ef4a">${c.region}, ${country.name}</span>
    <h1>Pickleball courts in ${c.name}</h1>
    <p>${intro}</p>
  </div>
  ${curve}
</section>
<section class="section" style="padding-top:50px"><div class="wrap">
  ${ok ? '' : `<p class="note">We are still building out ${c.name}. The venues below are checked, and more are being added. Know one we have missed? <a href="/contact/">Tell us</a>.</p><br>`}
  <div class="listing-tools">
    <h2 style="margin:0;font-size:1.5rem">${plural(s.venues, 'venue', 'venues')} in ${c.name}</h2>
    <div class="filters" role="group" aria-label="Filter venues">
      <button type="button" data-filter="all" aria-pressed="true">All</button>
      ${s.indoor ? '<button type="button" data-filter="indoor" aria-pressed="false">Indoor</button>' : ''}
      ${s.outdoor ? '<button type="button" data-filter="outdoor" aria-pressed="false">Outdoor</button>' : ''}
      ${s.free ? '<button type="button" data-filter="free" aria-pressed="false">Free</button>' : ''}
    </div>
  </div>
  <div class="venues">${list.map(venueCard).join('')}</div>
  <p style="margin-top:26px;font-size:.88rem;color:var(--muted)">Venue details last reviewed ${fmtDate(SITE.updated)}. Session times and prices change often, so confirm with the venue before you go.</p>
</div></section>
<section class="section soft"><div class="narrow">
  <div class="center"><span class="eyebrow">${c.name} FAQs</span><h2>Playing pickleball in ${c.name}</h2></div>
  ${faqBlock(faqs)}
  <p class="center" style="margin-top:30px"><a class="btn" href="/guides/how-to-start-playing-pickleball/">New to pickleball? Start here</a></p>
</div></section>`;
  add(cityUrl(c), layout({
    title: `Pickleball Courts in ${c.name} (${s.venues} Venues) | Indoor & Outdoor`,
    description: `${s.venues} places to play pickleball in ${c.name}, ${c.regionShort}${s.indoor ? `, including ${s.indoor} indoor venues` : ''}. Addresses, court counts and booking links, checked ${fmtDate(SITE.updated)}.`,
    url: cityUrl(c), body, noindex: !ok, nav: `/${country.slug}/`,
    schema: [
      crumbSchema(trail),
      { '@context': 'https://schema.org', '@type': 'ItemList', name: `Pickleball courts in ${c.name}`, itemListElement: list.map((v, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE.url + venueUrl(v), name: v.name })) },
      faqSchema(faqs),
    ],
  }), { index: ok });
}

// Venue pages
for (const v of venues) {
  const c = cityOf(v);
  const country = COUNTRIES[c.country];
  const ok = indexable(c);
  const trail = [{ name: 'Home', url: '/' }, { name: country.name, url: `/${country.slug}/` }, { name: c.name, url: cityUrl(c) }, { name: v.name, url: venueUrl(v) }];
  const nearby = venuesIn(c).filter((x) => x.slug !== v.slug).slice(0, 6);
  const fact = (k, val) => `<div><dt>${k}</dt><dd>${val}</dd></div>`;
  const nc = '<span style="color:var(--muted);font-weight:400">Not confirmed</span>';
  const body = `
<section class="page-hero">
  ${img(c.image, `Pickleball in ${c.name}`, { cls: 'hero-img', eager: true })}
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(14,38,30,.92),rgba(14,38,30,.5))"></div>
  <div class="wrap">
    ${crumbs(trail)}
    <span class="eyebrow" style="color:#d8ef4a">${esc(v.area)}, ${c.name}</span>
    <h1>${esc(v.name)}</h1>
    <p>${esc(v.address)}</p>
  </div>
  ${curve}
</section>
<section class="section" style="padding-top:50px"><div class="wrap detail">
  <div>
    <p style="font-size:1.1rem">${esc(venueSummary(v))}</p>
    ${v.settingNote ? `<p>${esc(v.settingNote)}.</p>` : ''}
    ${v.accessNote ? `<p>${esc(v.accessNote)}</p>` : ''}
    <div class="facts"><dl>
      ${fact('Address', esc(v.address))}
      ${fact('Courts', v.courts ? v.courts : nc)}
      ${fact('Indoor or outdoor', v.setting ? SETTING[v.setting] : nc)}
      ${fact('Surface', v.surface ? esc(v.surface) : nc)}
      ${fact('Access', v.access ? ACCESS[v.access] : nc)}
      ${v.hours ? fact('Hours', esc(v.hours)) : ''}
      ${fact('Last checked', fmtDate(v.lastChecked))}
    </dl></div>
    <p style="margin-top:18px;font-size:.88rem;color:var(--muted)">Source: ${esc(v.source)}. Session times, prices and court numbers can change, so confirm with ${esc(v.name)} before you travel. If anything here is wrong, <a href="/contact/">let us know</a>.</p>
  </div>
  <aside>
    <div class="side-box">
      <h3>Plan your visit</h3>
      ${v.website ? `<a class="btn" href="${esc(v.website)}" rel="nofollow noopener" target="_blank">Book or visit website</a>` : ''}
      <a class="btn" style="background:var(--ink);border-color:var(--ink)" href="${mapsLink(v)}" rel="noopener" target="_blank">Get directions</a>
    </div>
    ${nearby.length ? `<div class="side-box" style="margin-top:22px;background:#fff;border:1px solid var(--line)"><h3>More courts in ${c.name}</h3><ul class="mini-list">${nearby.map((x) => `<li><a href="${venueUrl(x)}">${esc(x.name)}</a><span>${esc(x.area)}${x.setting ? ' &middot; ' + SETTING[x.setting] : ''}</span></li>`).join('')}</ul><p style="margin:14px 0 0"><a href="${cityUrl(c)}">All ${c.name} courts &rarr;</a></p></div>` : ''}
  </aside>
</div></section>`;
  const locality = v.area.replace(/\s*\(.*\)$/, '');
  add(venueUrl(v), layout({
    title: `${v.name} Pickleball, ${locality} | ${c.name} Courts`,
    description: `${venueSummary(v)} Address, court details and booking link.`.slice(0, 300),
    url: venueUrl(v), body, noindex: !ok, nav: `/${country.slug}/`,
    schema: [
      crumbSchema(trail),
      { '@context': 'https://schema.org', '@type': 'SportsActivityLocation', name: v.name, url: SITE.url + venueUrl(v), sport: 'Pickleball',
        address: { '@type': 'PostalAddress', streetAddress: v.address, addressLocality: locality, addressRegion: c.regionShort, addressCountry: country.code },
        ...(v.website ? { sameAs: [v.website] } : {}) },
    ],
  }), { index: ok });
}

// Beginner guide
(function guide() {
  const url = '/guides/how-to-start-playing-pickleball/';
  const trail = [{ name: 'Home', url: '/' }, { name: 'Beginner guide', url }];
  const faqs = [
    { q: 'Do I need my own paddle to start?', a: '<p>No. Many venues lend or hire paddles for beginner and social sessions. Try a few before you buy your own.</p>' },
    { q: 'What shoes should I wear?', a: '<p>Court shoes with good side support. Running shoes are built for forward motion and make sideways movement less stable. Indoor halls often require non-marking soles.</p>' },
    { q: 'How long does a game take?', a: '<p>A casual doubles game to 11 points usually takes 10 to 20 minutes, which is why social sessions rotate players often.</p>' },
  ];
  const body = `
<section class="page-hero">
  ${img('player-serve', 'Player hitting a pickleball', { cls: 'hero-img', eager: true })}
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(14,38,30,.9),rgba(14,38,30,.4))"></div>
  <div class="wrap">${crumbs(trail)}<span class="eyebrow" style="color:#d8ef4a">Beginner guide</span><h1>How to start playing pickleball</h1><p>What to bring, the handful of rules you need, and how to find a beginner-friendly session near you.</p></div>
  ${curve}
</section>
<article class="section article" style="padding-top:50px"><div class="narrow">
  <p>Pickleball mixes elements of tennis, badminton and table tennis on a small court with a solid paddle and a light plastic ball with holes. It is quick to learn, social, and easy on beginners, which is why so many community centres and dedicated venues now run sessions for new players.</p>

  <h2>What you need for your first session</h2>
  <ul>
    <li><strong>Court shoes.</strong> Sideways support matters more than cushioning. Indoor venues often ask for non-marking soles.</li>
    <li><strong>A paddle, borrowed or hired.</strong> Most beginner sessions have loan paddles, so you do not need to buy one straight away.</li>
    <li><strong>Water and comfortable sportswear.</strong> Games are short but you will move more than you expect.</li>
    <li><strong>A booking.</strong> Popular sessions fill up. Check the venue's booking page a few days ahead.</li>
  </ul>

  <h2>The basic rules in plain English</h2>
  <h3>The court</h3>
  <p>A pickleball court is 20 feet wide and 44 feet long, the same size as a badminton doubles court. The net is a little lower in the middle than at the posts. Many venues use lines painted on tennis or multi-sport courts.</p>
  <h3>Serving</h3>
  <p>Serves are hit underhand and diagonally across the court, landing beyond the non-volley zone on the other side. The server must keep both feet behind the baseline when they hit the ball.</p>
  <h3>The two-bounce rule</h3>
  <p>After the serve, the receiving side must let the ball bounce once, and then the serving side must also let the return bounce once. After those two bounces, players can volley (hit the ball in the air) or play it off the bounce.</p>
  <h3>The kitchen</h3>
  <p>The non-volley zone, known as the kitchen, is the area within 7 feet of the net on each side. You cannot volley while standing in it. You can step in to play a ball that has bounced there.</p>
  <h3>Scoring</h3>
  <p>Games are usually played to 11 points and must be won by 2. In traditional scoring only the serving side can win a point, and the server calls three numbers in doubles: their score, the opponent's score and which server they are.</p>
  ${img('night-play', 'Doubles players at the kitchen line during an evening game', { sizes: '(max-width:820px) 100vw, 820px' })}

  <h2>How to find a beginner-friendly session</h2>
  <p>Look for sessions labelled come-and-try, social, open play or beginner. They mix you in with players at a similar level and usually include a quick rules run-through. Indoor venues are the most reliable choice in winter or wet weather, while public outdoor courts are often free and first come, first served.</p>
  <p>Start with your city:</p>
  <ul>${cities.map((c) => `<li><a href="${cityUrl(c)}">Pickleball courts in ${c.name}</a></li>`).join('')}</ul>

  <h2>Tips for your first few games</h2>
  <ul>
    <li>Keep the paddle face up and in front of you. Short, compact swings win more points than big ones.</li>
    <li>Aim for consistency over power. Getting the ball back in play matters most at the start.</li>
    <li>Move towards the kitchen line after the two-bounce rule is satisfied. Most points are won at the net.</li>
    <li>Ask questions. Pickleball players are famously welcoming to newcomers.</li>
  </ul>

  <h2>Common questions</h2>
  ${faqBlock(faqs)}
  <p style="margin-top:24px;font-size:.88rem;color:var(--muted)">This guide covers casual recreational play. Official rules are published by your national pickleball association and are updated from time to time.</p>
</div></article>`;
  add(url, layout({
    title: 'How to Start Playing Pickleball: A Beginner Guide | Pickleball Court Spot',
    description: 'What to bring, the basic pickleball rules in plain English (serving, two-bounce rule, the kitchen, scoring) and how to find a beginner session near you.',
    url, body, nav: url,
    schema: [crumbSchema(trail), faqSchema(faqs), { '@context': 'https://schema.org', '@type': 'Article', headline: 'How to start playing pickleball', dateModified: SITE.updated, author: { '@type': 'Organization', name: SITE.name }, publisher: { '@type': 'Organization', name: SITE.name } }],
  }));
})();

// Simple pages
function simplePage(url, title, description, h1, eyebrow, inner, image = 'paddle-court') {
  const trail = [{ name: 'Home', url: '/' }, { name: h1, url }];
  const body = `
<section class="page-hero">
  ${img(image, '', { cls: 'hero-img', eager: true })}
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(14,38,30,.92),rgba(14,38,30,.55))"></div>
  <div class="wrap">${crumbs(trail)}<span class="eyebrow" style="color:#d8ef4a">${eyebrow}</span><h1>${h1}</h1></div>
  ${curve}
</section>
<section class="section article" style="padding-top:50px"><div class="narrow">${inner}</div></section>`;
  add(url, layout({ title, description, url, body, nav: url, schema: [crumbSchema(trail)] }));
}

simplePage('/about/', 'About Pickleball Court Spot | How We Check Court Listings', 'Who runs Pickleball Court Spot, where our venue data comes from and how we keep listings accurate.', 'About us', 'Who we are', `
  <p>Pickleball Court Spot is an independent directory that helps players find somewhere to play in Canada and Australia. We started it because finding a court often meant piecing together club pages, council websites and social media posts, many of them out of date.</p>
  <h2>How we build each listing</h2>
  <ul>
    <li>We gather venue details from venue websites, council and league venue lists, and other public listings.</li>
    <li>We record the full address, whether courts are indoor or outdoor, the number of courts, how access works and a link to book.</li>
    <li>If sources disagree on a detail, such as the number of courts, we leave it marked as not confirmed rather than guess.</li>
    <li>Every listing shows the date it was last checked and where the details came from.</li>
  </ul>
  <h2>How we keep it current</h2>
  <p>Venues open, close and change their schedules often. We review listings regularly and act on corrections from players and venue owners. If you spot something wrong, please <a href="/contact/">let us know</a>.</p>
  <h2>Independence</h2>
  <p>We are not affiliated with any pickleball association, league or venue, and venues cannot pay to change their details or position. Listings are free. The site may show advertising to cover running costs, and any advertising is kept separate from venue information.</p>
`, 'night-play');

simplePage('/contact/', 'Contact Us or Suggest a Pickleball Court | Pickleball Court Spot', 'Suggest a new pickleball venue, send a correction or get in touch with Pickleball Court Spot.', 'Contact &amp; suggest a court', 'Get in touch', `
  <p>We would love to hear from players and venue owners. The quickest way to reach us is by email at <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>
  <h2>Suggesting a new court</h2>
  <p>To help us add a venue quickly, please include:</p>
  <ul>
    <li>Venue name and full street address</li>
    <li>Indoor, outdoor or both, and the number of courts</li>
    <li>Whether it is free, membership or pay to play</li>
    <li>A link to the venue's website or booking page</li>
  </ul>
  <p><a class="btn" href="mailto:${SITE.email}?subject=${encodeURIComponent('New court suggestion')}">Email a court suggestion</a></p>
  <h2>Corrections</h2>
  <p>If a listing is out of date, email us with the page link and what has changed. Venue owners are welcome to send updated details directly.</p>
`, 'paddle-net');

simplePage('/privacy-policy/', 'Privacy Policy | Pickleball Court Spot', 'How Pickleball Court Spot collects, uses and protects information, including cookies and advertising.', 'Privacy policy', 'Legal', `
  <p><em>Last updated ${fmtDate(SITE.updated)}</em></p>
  <p>This policy explains what information Pickleball Court Spot ("we", "us") collects when you use pickleballcourtspot.com and how it is used.</p>
  <h2>Information you send us</h2>
  <p>If you email us, we receive your email address and whatever you include in your message. We use it only to reply and to update listings, and we do not sell it.</p>
  <h2>Information collected automatically</h2>
  <p>Like most websites, our hosting provider records standard technical information such as IP address, browser type and pages visited, for security and to keep the site running. We may use privacy-friendly analytics to understand which pages are useful.</p>
  <h2>Cookies and advertising</h2>
  <p>We may show ads served by third-party vendors, including Google. These vendors use cookies to serve ads based on your prior visits to this and other websites. Google's use of advertising cookies enables it and its partners to serve ads based on your visits to our site and other sites on the internet.</p>
  <p>You can opt out of personalised advertising by visiting <a href="https://www.google.com/settings/ads" rel="noopener" target="_blank">Google Ads Settings</a> or <a href="https://www.aboutads.info/choices/" rel="noopener" target="_blank">www.aboutads.info</a>. Where required by law, we will ask for your consent before setting advertising cookies.</p>
  <h2>Links to other websites</h2>
  <p>Venue listings link to third-party websites and booking systems. Their privacy practices are their own, so please review their policies.</p>
  <h2>Your rights</h2>
  <p>Depending on where you live, including Canada (PIPEDA) and Australia (Privacy Act 1988), you may have the right to access or correct personal information we hold about you. Contact us at <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>
  <h2>Changes</h2>
  <p>We may update this policy from time to time. The date at the top shows when it was last changed.</p>
`, 'paddle-court');

// ---------- write ----------
fs.rmSync(DIST, { recursive: true, force: true });
for (const p of pages) {
  const file = path.join(DIST, p.url, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, p.html);
}
// 404
fs.writeFileSync(path.join(DIST, '404.html'), layout({ title: 'Page not found | Pickleball Court Spot', description: 'This page could not be found.', url: '/404', noindex: true,
  body: `<section class="section center"><div class="narrow"><span class="eyebrow">404</span><h1>That court is out of bounds</h1><p>The page you are looking for does not exist or has moved.</p><a class="btn" href="/">Back to the home page</a></div></section>` }));

// static assets
fs.mkdirSync(path.join(DIST, 'img'), { recursive: true });
for (const f of fs.readdirSync('src/img')) fs.copyFileSync(path.join('src/img', f), path.join(DIST, 'img', f));
for (const f of ['styles.css', 'main.js', 'favicon.svg']) fs.copyFileSync(path.join('src', f), path.join(DIST, f));

const indexed = pages.filter((p) => p.index);
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexed.map((p) => `  <url><loc>${SITE.url}${p.url}</loc><lastmod>${SITE.updated}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

console.log(`Built ${pages.length} pages (${indexed.length} indexable, ${pages.length - indexed.length} noindex) into ./${DIST}`);
