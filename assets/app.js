// Instalomat: video, izbornik, radno vrijeme, karta, animacije pri skrolanju
(() => {
  const d = document, root = d.documentElement, body = d.body;
  body.classList.remove("no-js");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches && !/[?&]motion=1/.test(location.search);

  // Hero video: pick the right encode for the screen, fade in over the identical poster frame
  const vid = d.getElementById("heroVid"), toggle = d.getElementById("vidToggle");
  const saveData = navigator.connection && navigator.connection.saveData;
  const pickSrc = () => {
    const portrait = innerWidth / innerHeight < 0.8;
    if (portrait) return "assets/hero-portrait.mp4";
    return innerWidth * Math.min(devicePixelRatio || 1, 2) > 1300 ? "assets/hero-1080.mp4" : "assets/hero-720.mp4";
  };
  const setToggle = (paused) => {
    toggle.querySelector("span").textContent = paused ? "Pokreni video" : "Pauziraj video";
    toggle.querySelector("path").setAttribute("d", paused ? "M7 4.5v15l12-7.5z" : "M6 5h4v14H6zM14 5h4v14h-4z");
  };
  const startVideo = () => {
    vid.src = pickSrc();
    vid.addEventListener("playing", () => vid.classList.add("on"), { once: true });
    const p = vid.play(); if (p && p.catch) p.catch(() => {});
  };
  toggle.hidden = false;
  if (reduce || saveData) { setToggle(true); toggle.addEventListener("click", function once() { startVideo(); setToggle(false); toggle.removeEventListener("click", once); toggle.addEventListener("click", flip); }); }
  else { addEventListener("load", startVideo, { once: true }); toggle.addEventListener("click", flip); }
  function flip() { if (vid.paused) { vid.play(); setToggle(false); } else { vid.pause(); setToggle(true); } }
  d.addEventListener("visibilitychange", () => { if (d.hidden) vid.pause(); else if (vid.src && toggle.querySelector("span").textContent === "Pauziraj video") vid.play().catch(() => {}); });

  // Menu
  const menuBtn = d.getElementById("menuBtn");
  const setMenu = (open) => { body.classList.toggle("menu-open", open); menuBtn.setAttribute("aria-expanded", open); menuBtn.setAttribute("aria-label", open ? "Zatvori izbornik" : "Otvori izbornik"); };
  menuBtn.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
  d.querySelectorAll(".mnav a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  d.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  // Opening hours status (Europe/Zagreb)
  const hours = { 1: [7, 15], 2: [7, 15], 3: [7, 15], 4: [7, 15], 5: [7, 15], 6: [7, 13], 0: null };
  const names = ["u nedjelju", "u ponedjeljak", "u utorak", "u srijedu", "u četvrtak", "u petak", "u subotu"];
  const now = () => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Zagreb", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")), h: (+get("hour") % 24) + (+get("minute")) / 60 };
  };
  const status = () => {
    const { day, h } = now(), t = hours[day];
    if (t && h >= t[0] && h < t[1]) return { open: true, text: "Otvoreno do " + String(t[1]).padStart(2, "0") + ":00", short: "Otvoreno", day };
    if (t && h < t[0]) return { open: false, text: "Zatvoreno · otvaramo danas u 07:00", short: "Zatvoreno", day };
    for (let i = 1; i <= 7; i++) { const nd = (day + i) % 7; if (hours[nd]) return { open: false, text: "Zatvoreno · otvaramo " + (i === 1 ? "sutra" : names[nd]) + " u 07:00", short: "Zatvoreno", day }; }
  };
  const s = status();
  d.querySelectorAll("[data-status]").forEach((el) => { el.textContent = s.text; el.classList.toggle("open", s.open); });
  const pill = d.querySelector("[data-pill]"); pill.textContent = s.short; pill.classList.toggle("open", s.open);
  const today = d.querySelector('#days [data-day="' + s.day + '"]'); if (today) today.classList.add("today");

  // Map facade
  d.getElementById("mapBtn").addEventListener("click", () => {
    const f = d.createElement("iframe");
    f.src = "https://www.google.com/maps?q=Vodoinstalater+Zagreb+-+Instalomat,+Ul.+Rebar+83,+10000+Zagreb&z=16&output=embed";
    f.title = "Karta: Instalomat, Ul. Rebar 83, Zagreb"; f.loading = "lazy"; f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"); f.referrerPolicy = "no-referrer-when-downgrade";
    d.getElementById("map").replaceChildren(f);
  });

  // Reveal on scroll
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  d.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

  // Scroll-driven: header, progress, parallax (transform only), process pipe
  const hdr = d.getElementById("hdr"), prog = d.getElementById("progress"), fab = d.getElementById("fab"), mbar = d.getElementById("mbar");
  const heroLayers = [...d.querySelectorAll("[data-hero-depth]")];
  const heroContent = d.querySelector(".hero-content");
  const layers = [...d.querySelectorAll("[data-speed],[data-speed-x]")].map((el) => ({ el, scope: el.closest("section"), y: +(el.dataset.speed || 0), x: +(el.dataset.speedX || 0) }));
  const steps = d.getElementById("steps"), stepEls = [...steps.querySelectorAll(".step")];
  const ruler = d.querySelector(".spec-ruler");
  let ticking = false, vh = innerHeight, k = innerWidth < 700 ? 0.6 : 1;
  addEventListener("resize", () => { vh = innerHeight; k = innerWidth < 700 ? 0.6 : 1; update(); }, { passive: true });
  function update() {
    ticking = false;
    const y = scrollY, max = root.scrollHeight - vh;
    prog.style.transform = "scaleX(" + (max > 0 ? y / max : 0).toFixed(4) + ")";
    hdr.classList.toggle("solid", y > 80);
    const past = y > vh * 0.7;
    fab.classList.toggle("show", past); mbar.classList.toggle("show", past);
    // pipe fill in "Kako radimo"
    const r = steps.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (vh * 0.78 - r.top) / (r.height + vh * 0.25)));
    steps.style.setProperty("--p", p.toFixed(3));
    stepEls.forEach((el) => el.classList.toggle("lit", p >= +el.dataset.at));
    if (reduce) return;
    if (y < vh * 1.3) {
      heroLayers.forEach((el) => { el.style.transform = "translate3d(0," + (y * el.dataset.heroDepth).toFixed(1) + "px,0)"; });
      heroContent.style.opacity = Math.max(0, 1 - y / (vh * 0.75)).toFixed(3);
      if (ruler) ruler.style.setProperty("--lvl", (0.62 - Math.min(y / vh, 1) * 0.5).toFixed(3));
    }
    for (const L of layers) {
      const b = L.scope.getBoundingClientRect();
      if (b.bottom < -200 || b.top > vh + 200) continue;
      const c = b.top + b.height / 2 - vh / 2;
      L.el.style.translate = (L.x ? (-c * L.x * k).toFixed(1) + "px " : "0 ") + (L.y ? (-c * L.y * k).toFixed(1) + "px" : "0");
    }
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();
