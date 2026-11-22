/* ============================================================
   Xebec Studio — анимации и меню.
   Тексты, цены и контакты — в content.js (затем node build.js).
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- выбор языка запоминается ---------- */
function initLangs() {
  $$(".langs a").forEach(a => a.addEventListener("click", () => {
    try { localStorage.setItem("xebec-lang", a.hreflang); } catch (e) {}
  }));
}

/* ---------- шапка, меню, Log Pose ---------- */
function initChrome() {
  const bar = $("#bar"), nav = $("#nav"), btn = $("#menuBtn"), lp = $("#logpose"), needle = $("#needle");
  const close = () => { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); };
  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("open", open);
  });
  nav.addEventListener("click", e => { if (e.target.closest("a")) close(); });
  document.addEventListener("click", e => { if (nav.classList.contains("open") && !e.target.closest("#nav, #menuBtn")) close(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && nav.classList.contains("open")) { close(); btn.focus(); }
  });

  let ticking = false;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar.classList.toggle("solid", y > innerHeight * 0.6);
    lp.classList.toggle("on", y > innerHeight * 0.8);
    // стрелка Log Pose «ищет» следующий остров: полный оборот за страницу + лёгкое покачивание
    const p = max > 0 ? y / max : 0;
    needle.style.transform = `rotate(${p * 360 + Math.sin(p * 40) * 8}deg)`;
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
}

/* ---------- лепестки сакуры падают, только пока раздел «Проекты» на экране ---------- */
function initSakura() {
  const scene = $(".isle-scene");
  if (!scene || reduced || !("IntersectionObserver" in window)) return;
  new IntersectionObserver(([en]) => scene.classList.toggle("play", en.isIntersecting)).observe($("#islands"));
}

/* ---------- форма заявки: письмо на почту через Web3Forms, клиент остаётся на сайте ---------- */
function initLead() {
  const form = $("#leadForm");
  if (!form || !window.fetch) return;
  form.noValidate = true;
  const box = form.closest(".lead-box"), done = $(".lead-done", box), fail = $(".lead-fail", form);
  const btn = $("button[type=submit]", form), btnText = btn.textContent;
  const select = $("#f-service", form);
  const fields = {
    name: { el: $("#f-name", form), ok: v => v.trim().length >= 2 },
    email: { el: $("#f-email", form), ok: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) }
  };
  const show = (f, on) => {
    const err = $("#" + f.el.id + "-err", form);
    f.el.setAttribute("aria-invalid", String(on));
    err.textContent = on ? err.dataset.msg : "";
  };
  Object.values(fields).forEach(f => {
    f.el.addEventListener("blur", () => { if (f.el.value) show(f, !f.ok(f.el.value)); });
    f.el.addEventListener("input", () => { if (f.el.getAttribute("aria-invalid") === "true" && f.ok(f.el.value)) show(f, false); });
  });

  // «Заказать» на карточке цены сразу выбирает нужную услугу
  $$("[data-service]").forEach(a => a.addEventListener("click", () => {
    const opt = $(`option[data-id="${a.dataset.service}"]`, select);
    if (opt) select.value = opt.value;
    if (!done.hidden) { form.hidden = false; done.hidden = true; }
    setTimeout(() => fields.name.el.focus({ preventScroll: true }), reduced ? 0 : 600);
  }));

  $("#leadAgain").addEventListener("click", () => {
    form.reset(); Object.values(fields).forEach(f => show(f, false));
    fail.hidden = true; form.hidden = false; done.hidden = true; fields.name.el.focus();
  });

  // запасной вариант, если сервис почты не ответил: готовое письмо и WhatsApp с текстом заявки
  function fallbackLinks() {
    const f = form.dataset, v = n => (form.elements[n].value || "").trim();
    const lines = [f.title, `${f.lName}: ${v("name")}`, `Email: ${v("email")}`, v("whatsapp_telegram") && `WhatsApp/Telegram: ${v("whatsapp_telegram")}`,
      `${f.lService}: ${v("service")}`, v("message") && `${f.lMsg}: ${v("message")}`].filter(Boolean).join("\n");
    $("#failMail").href = `mailto:${f.mail}?subject=${encodeURIComponent("Xebec Studio — " + v("service"))}&body=${encodeURIComponent(lines)}`;
    $("#failWa").href = `https://wa.me/${f.wa}?text=${encodeURIComponent(lines)}`;
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const bad = Object.values(fields).filter(f => !f.ok(f.el.value));
    Object.values(fields).forEach(f => show(f, bad.includes(f)));
    if (bad.length) { bad[0].el.focus(); return; }

    const data = Object.fromEntries(new FormData(form));
    delete data.redirect;
    data.subject = `Новая заявка с xebecweb.com — ${data.service} — ${data.name}`;
    data.replyto = data.email;
    btn.disabled = true; btn.textContent = btn.dataset.sending; fail.hidden = true;
    let ok = false;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data), signal: ctrl.signal
      });
      clearTimeout(timer);
      const json = await res.json().catch(() => ({}));
      ok = res.ok && json.success === true;
    } catch (err) { ok = false; }
    btn.disabled = false; btn.textContent = btnText;

    if (ok) {
      form.hidden = true; done.hidden = false; done.focus();
    } else {
      fallbackLinks(); fail.hidden = false;
    }
  });
}

/* ---------- на английской главной: подсказка про русскую / кыргызскую версию ---------- */
function initLangHint() {
  const bar = $("#langHint");
  if (!bar) return;
  let saved = null;
  try { saved = localStorage.getItem("xebec-lang"); } catch (e) {}
  if (saved) return;
  const langs = (navigator.languages || [navigator.language || ""]).map(l => l.slice(0, 2).toLowerCase());
  const want = langs.find(l => ["ky", "ru", "kk", "uk", "be", "uz", "tg"].includes(l));
  if (!want) return;
  const ky = want === "ky";
  $(".lh-ru", bar).hidden = ky; $(".lh-ky", bar).hidden = !ky;
  bar.hidden = false;
  $$("a", bar).forEach(a => a.addEventListener("click", () => { try { localStorage.setItem("xebec-lang", a.hreflang); } catch (e) {} }));
  $("#langHintClose").addEventListener("click", () => {
    bar.hidden = true;
    try { localStorage.setItem("xebec-lang", "en"); } catch (e) {}
  });
}

/* ---------- название поднимается из воды ---------- */
function introTitle() {
  const title = $(".title");
  $$(".title [aria-hidden]").forEach(span => {
    span.innerHTML = [...span.textContent].map(c => `<span class="ch">${c}</span>`).join("");
  });
  const chars = $$(".title .ch");
  const rest = [$(".lede"), $(".cta"), $(".scroll-cue")];
  if (reduced || !chars[0].animate) { title.classList.add("glow"); return; }
  chars.forEach((c, i) => {
    c.animate(
      [{ transform: "translateY(70%) scaleY(.6)", opacity: 0, filter: "blur(10px)" },
       { transform: "translateY(0) scaleY(1)", opacity: 1, filter: "blur(0)" }],
      { duration: 1100, delay: 350 + i * 70, easing: "cubic-bezier(.2,.9,.2,1)", fill: "backwards" }
    );
  });
  const end = 350 + chars.length * 70 + 600;
  rest.forEach((el, i) => el.animate(
    [{ opacity: 0, transform: el.classList.contains("scroll-cue") ? "translate(-50%,10px)" : "translateY(10px)" },
     { opacity: 1, transform: el.classList.contains("scroll-cue") ? "translate(-50%,0)" : "translateY(0)" }],
    { duration: 800, delay: end + i * 140, easing: "ease-out", fill: "backwards" }));
  setTimeout(() => title.classList.add("glow"), end - 200);
}

/* ============================================================
   Сцена: закатное море и шебека (xebec)
   ============================================================ */
function initSea() {
  const cv = $("#sea"), ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1, horizon = 0, running = true, t0 = performance.now(), last = 0;
  // на телефонах и слабых устройствах — 30 кадров в секунду и меньше бликов
  const lowPower = matchMedia("(max-width: 700px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  const GLINTS = lowPower ? 70 : 120;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  const clouds = Array.from({ length: 7 }, (_, i) => ({
    x: Math.random(), y: .1 + Math.random() * .36, w: .18 + Math.random() * .26, h: .012 + Math.random() * .02,
    s: .004 + Math.random() * .006, a: .18 + Math.random() * .22, warm: i % 2 === 0, d: .3 + Math.random() * .7
  }));
  const gulls = Array.from({ length: 5 }, () => ({
    x: Math.random(), y: .18 + Math.random() * .22, s: .012 + Math.random() * .012, size: 6 + Math.random() * 7, ph: Math.random() * 6
  }));

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, lowPower ? 1.5 : 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    horizon = H * (W < 700 ? .7 : .71);
  }

  const LAYERS = 7;
  const layerY = i => horizon + (H - horizon) * Math.pow((i + 1) / LAYERS, 1.55) * 1.02;
  const wave = (x, time, i) => {
    const amp = (2 + i * i * 1.3) * (H / 900);
    const k = .006 / (1 + i * .35);
    return layerY(i) + amp * (Math.sin(x * k + time * (.5 + i * .08) + i * 1.7) * .62 + Math.sin(x * k * 2.3 - time * (.7 + i * .05) + i) * .38);
  };

  function sky(time) {
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, "#1C1A44"); g.addColorStop(.35, "#47306A"); g.addColorStop(.68, "#B9506D");
    g.addColorStop(.88, "#F08E57"); g.addColorStop(1, "#FFCF86");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon + 2);

    // солнце, наполовину ушедшее за горизонт
    const sx = W * .5 + mouse.x * -8, r = Math.min(W, H) * .1, sy = horizon + r * .25;
    const glow = ctx.createRadialGradient(sx, sy, r * .2, sx, sy, r * 5);
    glow.addColorStop(0, "rgba(255,222,150,.65)"); glow.addColorStop(.3, "rgba(255,170,100,.22)"); glow.addColorStop(1, "rgba(255,140,90,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, horizon);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, horizon); ctx.clip();
    const sg = ctx.createLinearGradient(0, sy - r, 0, sy + r);
    sg.addColorStop(0, "#FFF2C4"); sg.addColorStop(.6, "#FFC46E"); sg.addColorStop(1, "#F59152");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // облака
    clouds.forEach(c => {
      const x = (((c.x + time * c.s * .02) % 1.4) - .2) * W + mouse.x * -18 * c.d;
      const y = c.y * horizon + mouse.y * -6 * c.d;
      const cg = ctx.createLinearGradient(0, y - c.h * H, 0, y + c.h * H);
      cg.addColorStop(0, c.warm ? `rgba(255,196,150,${c.a + .1})` : `rgba(150,100,160,${c.a + .1})`);
      cg.addColorStop(1, c.warm ? `rgba(240,120,110,0)` : `rgba(90,60,120,0)`);
      ctx.fillStyle = cg;
      for (let j = 0; j < 4; j++) {
        ctx.beginPath();
        ctx.ellipse(x + j * c.w * W * .22, y + Math.sin(j * 2.1) * c.h * H * .5, c.w * W * (.36 - j * .05), c.h * H * (1 - j * .15), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // чайки
    ctx.strokeStyle = "rgba(40,24,60,.75)"; ctx.lineCap = "round";
    gulls.forEach(b => {
      const x = (((b.x + time * b.s * .05) % 1.2) - .1) * W + mouse.x * -26;
      const y = b.y * horizon + Math.sin(time * .8 + b.ph) * 6;
      const f = Math.sin(time * 6 + b.ph) * .45, s = b.size * (W < 700 ? .7 : 1);
      ctx.lineWidth = Math.max(1.2, s * .18);
      ctx.beginPath();
      ctx.moveTo(x - s, y - s * (.25 + f)); ctx.quadraticCurveTo(x - s * .4, y - s * .45, x, y);
      ctx.quadraticCurveTo(x + s * .4, y - s * .45, x + s, y - s * (.25 + f));
      ctx.stroke();
    });
  }

  function water(time) {
    const g = ctx.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, "#F3A564"); g.addColorStop(.1, "#B0607A"); g.addColorStop(.35, "#34436E"); g.addColorStop(1, "#0D1B2E");
    ctx.fillStyle = g; ctx.fillRect(0, horizon, W, H - horizon);
  }

  function glitter(time) {
    const sx = W * .5 + mouse.x * -8;
    ctx.save();
    for (let i = 0; i < GLINTS; i++) {
      const depth = (i / GLINTS);
      const y = horizon + 3 + Math.pow(depth, 1.4) * (H - horizon) * .95;
      const spread = 14 + depth * W * .2;
      const n = Math.sin(i * 12.9898 + Math.floor(time * 3 + i) * 78.233) * 43758.5453;
      const rnd = n - Math.floor(n);
      const x = sx + (rnd - .5) * spread * 2;
      const w = (10 + depth * 90) * (.4 + rnd);
      const a = (1 - depth * .85) * .85 * (.4 + .6 * Math.abs(Math.sin(time * 2 + i)));
      ctx.fillStyle = `rgba(255,${200 + 40 * (1 - depth) | 0},140,${a})`;
      ctx.fillRect(x - w / 2, y, w, 1 + depth * 2.5);
    }
    ctx.restore();
  }

  function waveLayer(i, time) {
    const front = i / (LAYERS - 1);
    const px = mouse.x * (6 + i * 10);
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = -10; x <= W + 10; x += 12) ctx.lineTo(x, wave(x + px, time, i));
    ctx.lineTo(W, H); ctx.closePath();
    const top = layerY(i) - 10;
    const g = ctx.createLinearGradient(0, top, 0, H);
    const c1 = lerpColor([96, 72, 120], [20, 44, 76], front);
    const c2 = lerpColor([30, 40, 80], [12, 24, 42], front);
    g.addColorStop(0, `rgba(${c1},${.55 + front * .4})`); g.addColorStop(1, `rgba(${c2},1)`);
    ctx.fillStyle = g; ctx.fill();
    // светлая кромка гребня — отражение заката
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 12) { const y = wave(x + px, time, i); x < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.strokeStyle = `rgba(255,190,130,${.32 * (1 - front) + .06})`; ctx.lineWidth = 1 + front * 1.2; ctx.stroke();
  }
  const lerpColor = (a, b, k) => a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(",");

  // шебека: длинный низкий корпус с выступающим носом и три латинских (треугольных) паруса
  function ship(time) {
    const layer = 1.7;
    const scale = (W < 700 ? W * .0013 : Math.min(W, H * 1.7) * .00078) / 10;
    const travel = ((time * .006 + .3) % 1.3);
    const sx = W * (1.12 - travel) + mouse.x * -14;
    const by = layerY(layer) + 2;
    const y1 = wave(sx - 60 * scale * 10, time, 1), y2 = wave(sx + 60 * scale * 10, time, 1);
    const tilt = Math.atan2(y2 - y1, 120 * scale * 10) * .6;
    const bob = Math.sin(time * 1.3) * 2.2 * scale * 10;

    ctx.save();
    ctx.translate(sx, by + bob);
    ctx.rotate(tilt);
    ctx.scale(-scale * 10, scale * 10);
    const ink = "#24193B", rim = "rgba(255,196,120,.85)";

    // корпус
    ctx.beginPath();
    ctx.moveTo(-74, -10); ctx.lineTo(-58, -8);
    ctx.lineTo(48, -8); ctx.quadraticCurveTo(64, -10, 84, -18);
    ctx.lineTo(80, -12); ctx.quadraticCurveTo(66, 4, 44, 8);
    ctx.lineTo(-48, 8); ctx.quadraticCurveTo(-64, 4, -74, -10);
    ctx.closePath(); ctx.fillStyle = ink; ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(-58, -8); ctx.lineTo(48, -8); ctx.quadraticCurveTo(64, -10, 84, -18); ctx.stroke();
    // бушприт
    ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(78, -15); ctx.lineTo(104, -26); ctx.stroke();

    // мачты, наклонённые вперёд, и латинские паруса
    const masts = [{ x: 46, h: 70, yard: 64 }, { x: 4, h: 96, yard: 92 }, { x: -46, h: 66, yard: 58 }];
    const sway = Math.sin(time * .9) * .015;
    masts.forEach((m, i) => {
      const topX = m.x + 8, topY = -8 - m.h;
      ctx.strokeStyle = ink; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(m.x, -8); ctx.lineTo(topX, topY); ctx.stroke();
      // рей — длинная диагональ
      const a = -0.62 + sway, L = m.yard;
      const cx = m.x + 6, cy = -8 - m.h * .72;
      const ax = cx + Math.cos(a) * L * .62, ay = cy + Math.sin(a) * L * .62;
      const bx = cx - Math.cos(a) * L * .38, by2 = cy - Math.sin(a) * L * .38;
      // парус: треугольник от рея к нижнему углу
      const footX = m.x - 22 - i * 2, footY = -12;
      const belly = 7 + Math.sin(time * 1.1 + i) * 1.2;
      ctx.beginPath(); ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo((ax + footX) / 2 + belly, (ay + footY) / 2 + belly * .4, footX, footY);
      ctx.lineTo(bx, by2); ctx.closePath();
      const sg = ctx.createLinearGradient(bx, by2, ax, ay);
      sg.addColorStop(0, "rgba(255,226,170,.95)"); sg.addColorStop(1, "rgba(246,170,110,.9)");
      ctx.fillStyle = sg; ctx.fill();
      ctx.strokeStyle = "rgba(60,36,70,.55)"; ctx.lineWidth = .8; ctx.stroke();
      ctx.strokeStyle = ink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by2); ctx.stroke();
      if (i === 1) {
        // флаг студии
        const fw = Math.sin(time * 4) * 2;
        ctx.beginPath(); ctx.moveTo(topX, topY); ctx.quadraticCurveTo(topX - 8, topY + 2 + fw, topX - 18, topY + 1 + fw * 1.4);
        ctx.lineTo(topX - 18, topY + 9 + fw * 1.4); ctx.quadraticCurveTo(topX - 8, topY + 10 + fw, topX, topY + 9); ctx.closePath();
        ctx.fillStyle = "#F4B942"; ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.beginPath();
        ctx.moveTo(topX - 12, topY + 2.5 + fw * 1.1); ctx.lineTo(topX - 6, topY + 7.5 + fw * .9);
        ctx.moveTo(topX - 6, topY + 2.5 + fw * .9); ctx.lineTo(topX - 12, topY + 7.5 + fw * 1.1); ctx.stroke();
      }
    });
    ctx.restore();
  }

  function frame(now) {
    if (!running) return;
    if (lowPower && !reduced && now - last < 30) { requestAnimationFrame(frame); return; }
    last = now;
    const time = (now - t0) / 1000;
    mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
    ctx.clearRect(0, 0, W, H);
    sky(time);
    water(time);
    glitter(time);
    waveLayer(0, time);
    waveLayer(1, time);
    ship(time);
    for (let i = 2; i < LAYERS; i++) waveLayer(i, time);
    if (!reduced) requestAnimationFrame(frame);
  }

  resize();
  addEventListener("resize", () => { resize(); if (reduced) frame(t0 + 20000); });
  if (!reduced) {
    addEventListener("pointermove", e => { mouse.tx = e.clientX / innerWidth - .5; mouse.ty = e.clientY / innerHeight - .5; }, { passive: true });
    new IntersectionObserver(([en]) => {
      const was = running; running = en.isIntersecting;
      if (running && !was) requestAnimationFrame(frame);
    }).observe(cv);
    requestAnimationFrame(frame);
  } else {
    frame(t0 + 20000);
  }
}

/* ---------- старт ---------- */
initLangs();
initChrome();
initSakura();
initLead();
initLangHint();
introTitle();
initSea();
$("#year").textContent = new Date().getFullYear();
