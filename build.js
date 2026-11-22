/* Сборка сайта: node build.js
   Берёт тексты из content.js и создаёт в public/ готовые страницы:
   index.html (EN, главная), ru/index.html, ky/index.html, 404.html, sitemap.xml, robots.txt, _redirects */

const fs = require("fs");
const path = require("path");
const C = require("./content.js");

const OUT = path.join(__dirname, "public");
const LANGS = ["en", "ru", "ky"];           // английская — главная (xebecweb.com/)
const PATHS = { en: "/", ru: "/ru/", ky: "/ky/" };
const SHORT = { en: "EN", ru: "RU", ky: "KG" };
const SITE = C.SITE.replace(/\/$/, "");

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const wa = text => `https://wa.me/${C.WHATSAPP}?text=${encodeURIComponent(text)}`;
const tg = `https://t.me/${C.TELEGRAM.replace(/^@/, "")}`;

// относительная ссылка с одной языковой страницы на другую
function rel(from, to) {
  if (from === to) return "./";
  const up = from === "en" ? "" : "../";
  return (up + (to === "en" ? "" : `${to}/`)) || "./";
}

const ICONS = {
  landing: '<svg viewBox="0 0 64 64"><rect x="14" y="8" width="36" height="48" rx="3"/><path d="M20 18h24M20 26h16M20 40h24M20 46h18"/><rect x="20" y="31" width="10" height="4" rx="2"/></svg>',
  corporate: '<svg viewBox="0 0 64 64"><rect x="10" y="16" width="30" height="40" rx="3"/><path d="M18 12V10a2 2 0 0 1 2-2h28a2 2 0 0 1 2 2v36a2 2 0 0 1-2 2h-6"/><path d="M16 26h18M16 34h18M16 42h12"/></svg>',
  shop: '<svg viewBox="0 0 64 64"><path d="M12 22h40l-4 32H16z"/><path d="M24 22v-4a8 8 0 0 1 16 0v4"/><path d="M24 30v2M40 30v2"/></svg>',
  portfolio: '<svg viewBox="0 0 64 64"><rect x="12" y="8" width="40" height="48" rx="3"/><circle cx="32" cy="26" r="8"/><path d="M20 48c2-7 7-10 12-10s10 3 12 10"/></svg>',
  redesign: '<svg viewBox="0 0 64 64"><path d="M48 24a18 18 0 0 0-32-6"/><path d="M14 10v9h9"/><path d="M16 40a18 18 0 0 0 32 6"/><path d="M50 54v-9h-9"/><rect x="26" y="26" width="12" height="12" rx="2"/></svg>'
};

const PETALS = Array.from({ length: 14 }, (_, i) => {
  // детерминированный «случайный» разброс, чтобы сборка всегда давала одинаковый HTML
  const r = k => { const n = Math.sin((i + 1) * 12.9898 * k) * 43758.5453; return n - Math.floor(n); };
  const left = (r(1) * 100).toFixed(1), dur = (11 + r(2) * 9).toFixed(1), delay = (-r(3) * 20).toFixed(1);
  const size = (8 + r(4) * 8).toFixed(0), sway = (2.4 + r(5) * 2.4).toFixed(1);
  return `<i class="petal" style="left:${left}%;--d:${dur}s;--dl:${delay}s;--s:${size}px;--sw:${sway}s"><b></b></i>`;
}).join("");

// цена для карточки и для списка в форме
const num = v => +String(v).replace(/\s/g, "");
const priceOf = (p, d) => d.currency === "usd" ? `$${p.usd}` : p.kgs;
const priceLabel = (p, d) => d.currency === "usd"
  ? `${d.priceBefore} $${p.usd}`
  : d.priceShort ? `${p.kgs} ${d.priceShort}` : [d.priceBefore, p.kgs, d.priceAfter].filter(Boolean).join(" ");

function page(L) {
  const d = C.I18N[L];
  const pre = L === "en" ? "" : "../";
  const url = SITE + PATHS[L];
  const tilts = [-2.2, 1.6, -1, 2.1, -1.7];

  const alternates = LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${SITE + PATHS[l]}">`).join("\n") +
    `\n<link rel="alternate" hreflang="x-default" href="${SITE}/">`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Xebec Studio",
    url,
    image: `${SITE}/assets/og-${L}.jpg`,
    description: d.desc,
    email: C.EMAIL,
    telephone: C.WHATSAPP_SHOW.replace(/\s/g, ""),
    areaServed: "Worldwide",
    availableLanguage: ["English", "Russian", "Kyrgyz"],
    priceRange: d.currency === "usd"
      ? `$${Math.min(...C.PRICES.map(p => num(p.usd)))}–$${Math.max(...C.PRICES.map(p => num(p.usd)))}`
      : `${Math.min(...C.PRICES.map(p => num(p.kgs)))}–${Math.max(...C.PRICES.map(p => num(p.kgs)))} KGS`,
    founder: { "@type": "Person", name: L === "en" ? "Aktilek Kaziev" : "Актилек Казиев" },
    sameAs: [`https://instagram.com/${C.INSTAGRAM}`, `https://github.com/${C.GITHUB}`, tg],
    inLanguage: L
  };

  const langLinks = LANGS.map(l =>
    `<a href="${rel(L, l)}" hreflang="${l}" lang="${l}" aria-label="${esc(C.I18N[l].langName)}"${l === L ? ' aria-current="page"' : ""}>${SHORT[l]}</a>`
  ).join("");

  const posters = C.PRICES.map((p, i) => {
    const name = d["s." + p.id];
    return `<article class="poster" style="--tilt:${tilts[i % tilts.length]}deg">
        <div class="w" aria-hidden="true">${d.wanted}</div>
        <div class="pic" aria-hidden="true">${ICONS[p.id]}</div>
        <h3 class="name">${esc(name)}</h3>
        <div class="bounty">${d.priceBefore ? `<small>${esc(d.priceBefore)}</small>` : ""}<b>${priceOf(p, d)}</b>${d.priceAfter ? `<small>${esc(d.priceAfter)}</small>` : ""}</div>
        <p>${esc(d["s." + p.id + ".d"])}</p>
        <div class="term">${esc(d.term)}: ${esc(d["s." + p.id + ".t"])}</div>
        <a class="order" href="#contact" data-service="${p.id}">${esc(d.order)}</a>
      </article>`;
  }).join("\n      ");

  const projects = C.PROJECTS.map(p => {
    const isCode = p.url.includes("github.com");
    const label = isCode ? d.code : `${d.open} ${p.url.replace(/^https?:\/\//, "")}`;
    const name = d["pr." + p.id];
    const imgs = Array.isArray(p.img)
      ? `<span class="pair">${p.img.map(s => `<img src="${pre}${s}" width="960" height="600" alt="" loading="lazy" decoding="async">`).join("")}</span>`
      : `<img src="${pre}${p.img}" width="960" height="600" alt="${esc(name)}" loading="lazy" decoding="async">`;
    return `<li class="isle">
        <a class="shot${Array.isArray(p.img) ? " duo" : ""}" href="${p.url}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true"><span class="chrome"><i></i><i></i><i></i></span>${imgs}</a>
        <div>
          <h3>${esc(name)}</h3>
          <p>${esc(d["pr." + p.id + ".d"])}</p>
          <div class="tags">${esc(p.tags)}</div>
          <a class="link" href="${p.url}" target="_blank" rel="noopener">${esc(label)}</a>
        </div>
      </li>`;
  }).join("\n      ");

  const steps = [1, 2, 3, 4, 5, 6].map(n =>
    `<li><span class="n">${n}</span><div><h3>${esc(d[`p.${n}h`])}</h3><p>${esc(d[`p.${n}`])}</p></div></li>`
  ).join("\n      ");

  const inc = [1, 2, 3, 4, 5].map(n => `<li>${esc(d["inc." + n])}</li>`).join("\n        ");
  const chips = ["HTML", "CSS", "JavaScript", "React", "Java", "Spring Boot", "SQL", "Git"].map(s => `<span>${s}</span>`).join("");

  // на английской (главной) странице: если человек раньше выбрал другой язык — сразу открыть его
  const langRedirect = L === "en"
    ? `<script>try{var s=localStorage.getItem("xebec-lang");if(s==="ru"||s==="ky")location.replace(s+"/"+location.hash)}catch(e){}</script>\n`
    : "";
  // на главной: подсказка для тех, у кого браузер на русском или кыргызском
  const langHint = L === "en" ? `
<div class="lang-hint" id="langHint" hidden>
  <a class="lh-ru" href="ru/" hreflang="ru" lang="ru">${esc(C.I18N.ru.langHint)} → <b>${esc(C.I18N.ru.langGo)}</b></a>
  <a class="lh-ky" href="ky/" hreflang="ky" lang="ky">${esc(C.I18N.ky.langHint)} → <b>${esc(C.I18N.ky.langGo)}</b></a>
  <button type="button" id="langHintClose" aria-label="Close">×</button>
</div>` : "";
  const IG = `https://instagram.com/${C.INSTAGRAM}`;
  const igIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg>';

  return `<!doctype html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${langRedirect}<title>${esc(d.title)}</title>
<meta name="description" content="${esc(d.desc)}">
<link rel="canonical" href="${url}">
${alternates}
<meta name="theme-color" content="#0D1B2E">
${C.GOOGLE_VERIFY ? `<meta name="google-site-verification" content="${esc(C.GOOGLE_VERIFY)}">\n` : ""}${C.YANDEX_VERIFY ? `<meta name="yandex-verification" content="${esc(C.YANDEX_VERIFY)}">\n` : ""}${C.BING_VERIFY ? `<meta name="msvalidate.01" content="${esc(C.BING_VERIFY)}">\n` : ""}<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Xebec Studio">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(d.title)}">
<meta property="og:description" content="${esc(d.desc)}">
<meta property="og:image" content="${SITE}/assets/og-${L}.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${d.locale}">
${LANGS.filter(l => l !== L).map(l => `<meta property="og:locale:alternate" content="${C.I18N[l].locale}">`).join("\n")}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${pre}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${pre}assets/fonts/unbounded-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${pre}assets/fonts.css">
<link rel="stylesheet" href="${pre}styles.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<a class="skip" href="#main">${esc(d.skip)}</a>${langHint}

<header class="bar" id="bar">
  <a class="brand" href="#top" aria-label="Xebec Studio">
    <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 22h22l-3 5H8z" fill="currentColor"/><path d="M15 4v17M15 5l-9 15h9M17 7v14h8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
    <span>Xebec Studio</span>
  </a>
  <nav class="nav" id="nav" aria-label="Main">
    <a href="#captain">${esc(d["nav.about"])}</a>
    <a href="#bounties">${esc(d["nav.prices"])}</a>
    <a href="#islands">${esc(d["nav.work"])}</a>
    <a href="#voyage">${esc(d["nav.process"])}</a>
    <a href="#contact">${esc(d["nav.contact"])}</a>
  </nav>
  <nav class="langs" aria-label="${esc(d.langLabel)}">${langLinks}</nav>
  <button class="menu-btn" id="menuBtn" type="button" aria-expanded="false" aria-controls="nav"><span></span><span></span><span class="sr">${esc(d.menu)}</span></button>
</header>

<section class="hero" id="top">
  <canvas id="sea" aria-hidden="true"></canvas>
  <div class="hero-in">
    <h1 class="title"><span class="sr">${esc(d.h1)}</span><span class="t1" aria-hidden="true">XEBEC</span><span class="t2" aria-hidden="true">STUDIO</span></h1>
    <p class="lede">${esc(d["hero.lede"])}</p>
    <div class="cta">
      <a class="btn gold" href="#contact">${esc(d["hero.cta"])}</a>
      <a class="btn ghost" href="#bounties">${esc(d["hero.cta2"])}</a>
    </div>
  </div>
  <a class="scroll-cue" href="#captain"><span>${esc(d["hero.sail"])}</span><i aria-hidden="true"></i></a>
</section>

<main id="main" tabindex="-1">

<section class="captain" id="captain">
  <div class="wrap cap-grid">
    <figure class="cap-photo">
      <img src="${pre}assets/img/aktilek.webp" width="800" height="1066" alt="${esc(d["cap.alt"])}" loading="lazy" decoding="async">
      <figcaption>${esc(d["cap.fig"])}</figcaption>
    </figure>
    <div class="cap-text">
      <h2 class="h2">${esc(d["cap.h"])}</h2>
      <p>${esc(d["cap.p1"])}</p>
      <p>${esc(d["cap.p2"])}</p>
      <dl class="facts">
        <div><dt>${esc(d["cap.stack"])}</dt><dd class="chips">${chips}</dd></div>
        <div><dt>${esc(d["cap.langs"])}</dt><dd>${esc(d["cap.langsv"])}</dd></div>
        <div><dt>${esc(d["cap.where"])}</dt><dd>${esc(d["cap.wherev"])}</dd></div>
        <div><dt>Instagram</dt><dd><a class="ig-link" href="${IG}" target="_blank" rel="noopener">${igIcon}@${C.INSTAGRAM}</a></dd></div>
      </dl>
    </div>
  </div>
</section>

<section class="bounties" id="bounties">
  <div class="wrap">
    <h2 class="h2 center">${esc(d["b.h"])}</h2>
    <p class="sub center">${esc(d["b.sub"])}</p>
    <div class="posters">
      ${posters}
    </div>
    <div class="terms">
      <h3 class="h3">${esc(d["inc.h"])}</h3>
      <ul class="inc">
        ${inc}
      </ul>
      <p class="pay">${esc(d["inc.pay"])}</p>
    </div>
  </div>
</section>

<section class="islands" id="islands">
  <div class="isle-bg" aria-hidden="true">
    <div class="isle-scene">
      <img class="scene" src="${pre}assets/sakura-night.svg" alt="" decoding="async">
      <div class="petals">${PETALS}</div>
    </div>
  </div>
  <div class="wrap">
    <h2 class="h2">${esc(d["w.h"])}</h2>
    <p class="sub">${esc(d["w.sub"])}</p>
    <ol class="route">
      ${projects}
    </ol>
  </div>
</section>

<section class="voyage" id="voyage">
  <div class="wrap">
    <h2 class="h2">${esc(d["p.h"])}</h2>
    <ol class="steps">
      ${steps}
    </ol>
  </div>
</section>

<section class="contact" id="contact">
  <div class="wrap">
    <h2 class="h2">${esc(d["c.h"])}</h2>
    <p class="sub">${esc(d["c.sub"])}</p>

    <div class="lead-box">
      <p class="sent-note" id="sent" tabindex="-1">${esc(d["f.ok"])}</p>
      <form class="lead" id="leadForm" action="https://api.web3forms.com/submit" method="post"
            data-wa="${C.WHATSAPP}" data-mail="${C.EMAIL}" data-title="${esc(d["m.title"])}"
            data-l-name="${esc(d["m.name"])}" data-l-service="${esc(d["m.service"])}" data-l-msg="${esc(d["m.msg"])}">
        <input type="hidden" name="access_key" value="${esc(C.WEB3FORMS_KEY)}">
        <input type="hidden" name="subject" value="Новая заявка с xebecweb.com">
        <input type="hidden" name="from_name" value="Xebec Studio — xebecweb.com">
        <input type="hidden" name="redirect" value="${url}#sent">
        <input type="hidden" name="page" value="${L.toUpperCase()} · ${url}">
        <input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="field">
          <label for="f-name">${esc(d["f.name"])}</label>
          <input id="f-name" name="name" type="text" autocomplete="name" maxlength="80" required aria-describedby="f-name-err">
          <p class="err" id="f-name-err" data-msg="${esc(d["f.errName"])}"></p>
        </div>
        <div class="field">
          <label for="f-email">${esc(d["f.email"])}</label>
          <input id="f-email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="120" required aria-describedby="f-email-hint f-email-err">
          <p class="hint" id="f-email-hint">${esc(d["f.emailHint"])}</p>
          <p class="err" id="f-email-err" data-msg="${esc(d["f.errEmail"])}"></p>
        </div>
        <div class="field">
          <label for="f-phone">${esc(d["f.phone"])} <span class="opt">(${esc(d["f.optional"])})</span></label>
          <input id="f-phone" name="whatsapp_telegram" type="text" autocomplete="tel" maxlength="60">
        </div>
        <div class="field">
          <label for="f-service">${esc(d["f.service"])}</label>
          <select id="f-service" name="service">
            ${C.PRICES.map(p => `<option value="${esc(d["s." + p.id])}" data-id="${p.id}">${esc(d["s." + p.id])} — ${esc(priceLabel(p, d))}</option>`).join("\n            ")}
            <option value="${esc(d["f.other"])}" data-id="other">${esc(d["f.other"])}</option>
          </select>
        </div>
        <div class="field full">
          <label for="f-msg">${esc(d["f.msg"])} <span class="opt">(${esc(d["f.optional"])})</span></label>
          <textarea id="f-msg" name="message" rows="4" maxlength="2000" aria-describedby="f-msg-hint"></textarea>
          <p class="hint" id="f-msg-hint">${esc(d["f.msgHint"])}</p>
        </div>
        <div class="actions full">
          <button class="btn gold" type="submit" data-sending="${esc(d["f.sending"])}">${esc(d["f.send"])}</button>
          <p class="note">${esc(d["f.note"])}</p>
        </div>
        <div class="lead-fail full" role="alert" hidden>
          <p>${esc(d["f.fail"])}</p>
          <div class="fail-actions">
            <a class="btn ghost" id="failMail" href="mailto:${C.EMAIL}">${esc(C.EMAIL)}</a>
            <a class="btn ghost" id="failWa" href="https://wa.me/${C.WHATSAPP}" target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </div>
      </form>
      <div class="lead-done" role="status" tabindex="-1" hidden>
        <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/><path d="M14 25l7 7 13-15"/></svg>
        <p>${esc(d["f.ok"])}</p>
        <button class="btn ghost" type="button" id="leadAgain">${esc(d["f.again"])}</button>
      </div>
    </div>

    <p class="more">${esc(d["c.more"])}</p>
    <ul class="channels">
      <li><a href="mailto:${C.EMAIL}?subject=Xebec%20Studio">${esc(d["c.mail"])}<small>${C.EMAIL}</small></a></li>
      <li><a class="ch-ig" href="${IG}" target="_blank" rel="noopener">Instagram<small>@${C.INSTAGRAM}</small></a></li>
      <li><a href="${esc(wa(d.helloMsg))}" target="_blank" rel="noopener">${esc(d["c.wa"])}<small>${C.WHATSAPP_SHOW}</small></a></li>
      <li><a href="${tg}" target="_blank" rel="noopener">${esc(d["c.tg"])}<small>@${C.TELEGRAM.replace(/^@/, "")}</small></a></li>
      <li><a href="https://github.com/${C.GITHUB}" target="_blank" rel="noopener">GitHub<small>${C.GITHUB}</small></a></li>
    </ul>
  </div>
</section>

</main>

<footer class="foot">
  <div class="wrap foot-in">
    <span>© <span id="year">${new Date().getFullYear()}</span> Xebec Studio</span>
    <a class="foot-ig" href="${IG}" target="_blank" rel="noopener">${igIcon}@${C.INSTAGRAM}</a>
    <span>${esc(d["f.by"])}</span>
  </div>
</footer>

<a class="logpose" id="logpose" href="#top" aria-label="${esc(d.top)}">
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="34" r="22" class="lp-glass"/>
    <circle cx="32" cy="34" r="22" class="lp-ring"/>
    <path d="M28 10h8l-1 3h-6z" class="lp-cap"/>
    <g class="lp-ticks"><path d="M32 15v4M32 49v4M13 34h4M47 34h4"/></g>
    <g id="needle"><path d="M32 18l3.5 16h-7z" class="lp-n1"/><path d="M32 50l3.5-16h-7z" class="lp-n2"/><circle cx="32" cy="34" r="2.2" class="lp-cap"/></g>
  </svg>
</a>

<script src="${pre}main.js"></script>
</body>
</html>
`;
}

function notFound() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404 — Xebec Studio</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/fonts.css">
<link rel="stylesheet" href="/styles.css">
</head>
<body class="nf">
<main class="nf-in">
  <p class="nf-code">404</p>
  <h1 class="h2">This island isn't on the map</h1>
  <p class="sub">Этого острова нет на карте · Бул арал картада жок</p>
  <div class="cta"><a class="btn gold" href="/">Home</a><a class="btn ghost" href="/ru/">На главную</a><a class="btn ghost" href="/ky/">Башкы бет</a></div>
</main>
</body>
</html>
`;
}

function sitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = LANGS.map(l => `  <url>
    <loc>${SITE + PATHS[l]}</loc>
    <lastmod>${today}</lastmod>
${LANGS.map(a => `    <xhtml:link rel="alternate" hreflang="${a}" href="${SITE + PATHS[a]}"/>`).join("\n")}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>
  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

// ---------- zip для загрузки в Cloudflare (без сторонних библиотек) ----------
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function listFiles(dir, base = "") {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const rel = base ? `${base}/${e.name}` : e.name;
    return e.isDirectory() ? listFiles(path.join(dir, e.name), rel) : [rel];
  }).sort();
}
function makeZip(dir, outFile) {
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const locals = [], centrals = [];
  let offset = 0;
  for (const rel of listFiles(dir)) {
    const data = fs.readFileSync(path.join(dir, rel));
    const name = Buffer.from(rel, "utf8");
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    locals.push(lh, name, data);
    centrals.push(ch, name);
    offset += lh.length + name.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  const count = centrals.length / 2;
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(count, 8); end.writeUInt16LE(count, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  fs.writeFileSync(outFile, Buffer.concat([...locals, cd, end]));
  return count;
}

// ---------- запись ----------
if (!C.WEB3FORMS_KEY) console.warn("⚠️  WEB3FORMS_KEY пустой — форма не будет отправлять письма. Впиши ключ в content.js.");
fs.rmSync(path.join(OUT, "en"), { recursive: true, force: true }); // старый адрес /en/ теперь главная
for (const L of LANGS) {
  const dir = L === "en" ? OUT : path.join(OUT, L);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page(L));
}
fs.writeFileSync(path.join(OUT, "404.html"), notFound());
fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemap());
if (C.INDEXNOW_KEY) fs.writeFileSync(path.join(OUT, `${C.INDEXNOW_KEY}.txt`), C.INDEXNOW_KEY);
// старые ссылки /en/ ведут на новую английскую главную
fs.writeFileSync(path.join(OUT, "_redirects"), "/en / 301\n/en/ / 301\n/en/index.html / 301\n");
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
const files = makeZip(OUT, path.join(__dirname, "xebecweb-upload.zip"));
console.log(`Готово: сайт в public/, архив для Cloudflare — xebecweb-upload.zip (${files} файлов)`);
