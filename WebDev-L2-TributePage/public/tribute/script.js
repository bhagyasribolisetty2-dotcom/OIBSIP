/* =========================================================
   Kalpana — Beyond the Sky
   Vanilla JS: starfield canvas, launch sequence, flashlight,
   scroll zoom, timeline, counters, tilt, constellation, tributes
   ========================================================= */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  let paused = false;

  /* -------------------------------------------------------
     1. Global starfield: drifting particles, twinkling,
        shooting stars and a warp-speed mode
     ------------------------------------------------------- */
  const canvas = $("#starfield");
  const ctx = canvas.getContext("2d");
  let W = 0;
  let H = 0;
  let DPR = 1;
  let stars = [];
  let shooters = [];
  let warp = 0;
  let warpTarget = 0;

  function resizeCanvas() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const count = Math.round(Math.min(260, (W * H) / 6500));
    stars = Array.from({ length: count }, () => makeStar());
  }

  function makeStar() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      z: Math.random() * 0.9 + 0.1,
      r: Math.random() * 1.3 + 0.2,
      tw: Math.random() * Math.PI * 2,
      ts: Math.random() * 0.03 + 0.008,
      hue: Math.random() < 0.15 ? "214,184,121" : Math.random() < 0.3 ? "160,200,255" : "255,255,255",
    };
  }

  function spawnShooter() {
    const fromLeft = Math.random() < 0.5;
    shooters.push({
      x: fromLeft ? Math.random() * W * 0.5 : W * 0.5 + Math.random() * W * 0.5,
      y: Math.random() * H * 0.4,
      vx: (fromLeft ? 1 : -1) * (7 + Math.random() * 5),
      vy: 3 + Math.random() * 3,
      life: 1,
    });
  }

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);
    warp += (warpTarget - warp) * 0.06;
    const cx = W / 2;
    const cy = H / 2;

    for (const s of stars) {
      s.tw += s.ts;
      const alpha = 0.35 + Math.abs(Math.sin(s.tw)) * 0.65;

      if (warp > 0.02) {
        const dx = s.x - cx;
        const dy = s.y - cy;
        const speed = 1 + warp * 28 * s.z;
        const nx = s.x + dx * 0.012 * speed;
        const ny = s.y + dy * 0.012 * speed;
        ctx.strokeStyle = `rgba(${s.hue},${alpha})`;
        ctx.lineWidth = s.r * (1 + warp);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        s.x = nx;
        s.y = ny;
        if (s.x < -50 || s.x > W + 50 || s.y < -50 || s.y > H + 50) {
          s.x = cx + (Math.random() - 0.5) * 80;
          s.y = cy + (Math.random() - 0.5) * 80;
        }
      } else {
        s.x -= 0.06 * s.z;
        s.y += 0.02 * s.z;
        if (s.x < 0) s.x = W;
        if (s.y > H) s.y = 0;
        ctx.fillStyle = `rgba(${s.hue},${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (warp < 0.1 && Math.random() < 0.004) spawnShooter();
    shooters = shooters.filter((sh) => sh.life > 0);
    for (const sh of shooters) {
      const tail = 14;
      const grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * tail, sh.y - sh.vy * tail);
      grad.addColorStop(0, `rgba(255,245,220,${sh.life})`);
      grad.addColorStop(1, "rgba(255,245,220,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x - sh.vx * tail, sh.y - sh.vy * tail);
      ctx.stroke();
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.life -= 0.012;
    }
  }

  function loop() {
    if (!paused && !document.hidden) drawFrame();
    requestAnimationFrame(loop);
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  if (reduceMotion) {
    drawFrame();
  } else {
    requestAnimationFrame(loop);
  }

  /* -------------------------------------------------------
     2. Pause / resume all continuous animation
     ------------------------------------------------------- */
  const pauseBtn = $("#pauseBtn");
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    document.body.classList.toggle("paused", paused);
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.textContent = paused ? "Resume motion" : "Pause motion";
  });

  /* -------------------------------------------------------
     3. Navigation: progress bar, active link, mobile menu
     ------------------------------------------------------- */
  const nav = $(".nav");
  const progress = $(".progress");
  const navLinks = $$(".nav-links a");
  const menuToggle = $(".menu-toggle");
  const navList = $(".nav-links");

  menuToggle.addEventListener("click", () => {
    const open = navList.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });
  navLinks.forEach((a) =>
    a.addEventListener("click", () => {
      navList.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    }),
  );

  const navTargets = navLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => {
          const isActive = a.getAttribute("href") === `#${entry.target.id}`;
          a.classList.toggle("active", isActive);
          if (isActive) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  navTargets.forEach((t) => navObserver.observe(t));

  /* -------------------------------------------------------
     4. Scroll reveals + word-by-word text reveals
     ------------------------------------------------------- */
  $$(".split").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.textContent = "";
    words.forEach((w, i) => {
      const span = document.createElement("span");
      span.className = "word";
      span.setAttribute("aria-hidden", "true");
      span.style.transitionDelay = `${i * 70}ms`;
      span.textContent = w;
      el.append(span, " ");
    });
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  $$(".reveal, .split, .crew-stars").forEach((el) => revealObserver.observe(el));

  /* -------------------------------------------------------
     5. Hero: mouse parallax + spaceship launch sequence
     ------------------------------------------------------- */
  const hero = $("#home");
  const heroBg = $(".hero-bg");
  const heroContent = $(".hero-content");
  const shipWrap = $(".ship-wrap");
  const shipParallax = $(".ship-parallax");
  const shipBtn = $("#shipBtn");
  const countdown = $(".countdown");
  const flash = $(".flash");
  const replayBtn = $("#replayBtn");
  let launching = false;

  if (!reduceMotion && finePointer) {
    hero.addEventListener("pointermove", (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      heroBg.style.transform = `translate(${nx * -24}px, ${ny * -16}px)`;
      heroContent.style.transform = `translate(${nx * 12}px, ${ny * 8}px)`;
      shipParallax.style.transform = `translate(${nx * 40}px, ${ny * 30}px) rotate(${nx * 4}deg)`;
    });
  }

  async function launch() {
    if (launching) return;
    launching = true;
    shipBtn.setAttribute("aria-disabled", "true");

    if (reduceMotion) {
      $("#story").scrollIntoView();
      finishLaunch();
      return;
    }

    shipWrap.classList.add("charging");
    for (const n of [3, 2, 1]) {
      countdown.innerHTML = "";
      const span = document.createElement("span");
      span.textContent = n;
      countdown.append(span);
      countdown.setAttribute("aria-label", `Launch in ${n}`);
      await wait(1000);
    }
    countdown.innerHTML = "";

    shipWrap.classList.remove("charging");
    shipWrap.classList.add("flying");
    hero.classList.add("launching");
    flash.classList.remove("on");
    void flash.offsetWidth;
    flash.classList.add("on");
    warpTarget = 1;

    await wait(2300);
    warpTarget = 0;
    $("#story").scrollIntoView({ behavior: "smooth" });
    await wait(1200);
    finishLaunch();
  }

  function finishLaunch() {
    launching = false;
    replayBtn.hidden = false;
  }

  function resetHero() {
    shipWrap.classList.remove("flying", "charging");
    hero.classList.remove("launching");
    shipBtn.removeAttribute("aria-disabled");
  }

  shipBtn.addEventListener("click", launch);

  $("#skipBtn").addEventListener("click", () => {
    $("#story").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    replayBtn.hidden = false;
  });

  replayBtn.addEventListener("click", async () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    await wait(900);
    resetHero();
    shipBtn.focus({ preventScroll: true });
  });

  $("#returnBtn").addEventListener("click", async () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    await wait(900);
    resetHero();
  });

  /* -------------------------------------------------------
     6. Flashlight portrait reveal
     ------------------------------------------------------- */
  const stage = $(".flash-stage");
  const revealToggle = $("#revealToggle");
  let beamX = 50;
  let beamY = 45;

  function setBeam(x, y) {
    beamX = clamp(x, 0, 100);
    beamY = clamp(y, 0, 100);
    stage.style.setProperty("--x", `${beamX}%`);
    stage.style.setProperty("--y", `${beamY}%`);
  }

  function pointerToBeam(e) {
    const rect = stage.getBoundingClientRect();
    setBeam(((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100);
    stage.classList.add("active");
  }

  stage.addEventListener("pointermove", pointerToBeam);
  stage.addEventListener("pointerdown", pointerToBeam);
  stage.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") stage.classList.remove("active");
  });
  stage.addEventListener("keydown", (e) => {
    const step = 5;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (!moves[e.key]) return;
    e.preventDefault();
    stage.classList.add("active");
    setBeam(beamX + moves[e.key][0], beamY + moves[e.key][1]);
  });
  stage.addEventListener("focus", () => stage.classList.add("active"));

  function setBeamRadius() {
    stage.style.setProperty("--r", `${Math.round(stage.clientWidth * 0.26)}px`);
  }
  setBeamRadius();
  window.addEventListener("resize", setBeamRadius);

  revealToggle.addEventListener("click", () => {
    const full = stage.classList.toggle("full");
    revealToggle.setAttribute("aria-pressed", String(full));
    revealToggle.textContent = full ? "Return to flashlight" : "Reveal full portrait";
  });

  /* -------------------------------------------------------
     7. Earth → India → Haryana → Karnal scroll zoom
     ------------------------------------------------------- */
  const zoomSection = $(".zoom-section");
  const layers = {
    earth: $(".zoom-layer.earth"),
    india: $(".zoom-layer.india"),
    haryana: $(".zoom-layer.haryana"),
    karnal: $(".zoom-layer.karnal"),
  };
  const frames = {
    india: $(".zoom-layer.india .zoom-map-frame"),
    haryana: $(".zoom-layer.haryana .zoom-map-frame"),
    karnal: $(".zoom-layer.karnal .zoom-map-frame"),
  };
  const marker = $(".marker");
  const zoomStep = $(".zoom-step");
  const zoomHeadline = $(".zoom-caption h2");
  const zoomDots = $$(".zoom-dots li");

  function windowOpacity(p, a, b, c, d) {
    if (p <= a || p >= d) return 0;
    if (p < b) return (p - a) / (b - a);
    if (p <= c) return 1;
    return 1 - (p - c) / (d - c);
  }

  function updateZoom() {
    const rect = zoomSection.getBoundingClientRect();
    const total = zoomSection.offsetHeight - window.innerHeight;
    const p = clamp(-rect.top / total);

    layers.earth.style.opacity = windowOpacity(p, -1, -0.5, 0.16, 0.28);
    layers.earth.style.transform = `scale(${1 + p * 4})`;

    layers.india.style.opacity = windowOpacity(p, 0.16, 0.28, 0.4, 0.5);
    frames.india.style.transform = `scale(${0.6 + clamp((p - 0.16) / 0.34) * 1.6})`;

    layers.haryana.style.opacity = windowOpacity(p, 0.4, 0.5, 0.62, 0.72);
    frames.haryana.style.transform = `scale(${1 + clamp((p - 0.4) / 0.32) * 2.2})`;

    layers.karnal.style.opacity = windowOpacity(p, 0.62, 0.72, 2, 3);
    frames.karnal.style.transform = `scale(${0.85 + clamp((p - 0.62) / 0.38) * 0.3})`;

    const stepIndex = p < 0.22 ? 0 : p < 0.45 ? 1 : p < 0.67 ? 2 : 3;
    const steps = ["Earth", "India", "Haryana", "Karnal"];
    zoomStep.textContent = `${stepIndex + 1} / 4 — ${steps[stepIndex]}`;
    zoomDots.forEach((li, i) => li.classList.toggle("on", i <= stepIndex));
    marker.classList.toggle("on", p > 0.78);
    zoomHeadline.classList.toggle("on", p > 0.78);
  }

  /* -------------------------------------------------------
     8. Glowing timeline trajectory
     ------------------------------------------------------- */
  const timeline = $(".timeline");
  const timelineFill = $(".timeline-fill");
  const rocketHead = $(".rocket-head");

  function updateTimeline() {
    const rect = timeline.getBoundingClientRect();
    const p = clamp((window.innerHeight * 0.6 - rect.top) / rect.height);
    timelineFill.style.height = `${p * 100}%`;
    rocketHead.style.top = `${p * 100}%`;
  }

  /* -------------------------------------------------------
     Single scroll handler (rAF-throttled)
     ------------------------------------------------------- */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${clamp(window.scrollY / max)})`;
      nav.classList.toggle("scrolled", window.scrollY > 40);
      updateZoom();
      updateTimeline();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* -------------------------------------------------------
     9. Animated counters
     ------------------------------------------------------- */
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = Number(el.dataset.target);
        const duration = reduceMotion ? 0 : 1800;
        const start = performance.now();
        const tick = (now) => {
          const t = duration ? clamp((now - start) / duration) : 1;
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(target * eased).toLocaleString("en-US");
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
      });
    },
    { threshold: 0.6 },
  );
  $$("[data-target]").forEach((el) => counterObserver.observe(el));

  /* -------------------------------------------------------
     10. Mission card 3D tilt
     ------------------------------------------------------- */
  if (!reduceMotion && finePointer) {
    $$(".mission-card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--ry", `${(x - 0.5) * 12}deg`);
        card.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
        card.style.setProperty("--gx", `${x * 100}%`);
        card.style.setProperty("--gy", `${y * 100}%`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  /* -------------------------------------------------------
     11. Interactive constellation
     ------------------------------------------------------- */
  const milestones = [
    { x: 10, y: 72, label: "Karnal", date: "1961 / 1962", title: "Born in Karnal, Haryana", img: "assets/images/map-karnal.png", alt: "Map of Haryana with Karnal district highlighted", text: "Kalpana Chawla was born in Karnal. NASA records give 1 July 1961; family accounts give 17 March 1962." },
    { x: 22, y: 50, label: "PEC", date: "1982", title: "Aeronautical Engineering", img: "assets/images/map-india.png", alt: "Orthographic map highlighting India", text: "Bachelor of Engineering in aeronautical engineering from Punjab Engineering College, Chandigarh — often noted as the only woman in her aeronautics class." },
    { x: 36, y: 62, label: "UT Arlington", date: "1984", title: "Master of Science, Texas", img: "assets/images/map-haryana.png", alt: "Map of India with Haryana highlighted", text: "Master of Science in aerospace engineering from the University of Texas at Arlington." },
    { x: 48, y: 36, label: "Boulder", date: "1988", title: "PhD, University of Colorado", img: "assets/images/kalpana-portrait.jpg", alt: "NASA portrait of Kalpana Chawla", text: "Doctorate in aerospace engineering from the University of Colorado Boulder, after a second master's degree there in 1986." },
    { x: 60, y: 54, label: "NASA Ames", date: "1988", title: "NASA Ames Research Center", img: "assets/images/kalpana-portrait.jpg", alt: "NASA portrait of Kalpana Chawla", text: "Began work on powered-lift computational fluid dynamics at NASA Ames Research Center, California." },
    { x: 70, y: 26, label: "Astronaut", date: "1994", title: "Selected as an Astronaut", img: "assets/images/kalpana-portrait.jpg", alt: "NASA portrait of Kalpana Chawla in an orange launch and entry suit", text: "Selected by NASA in December 1994; reported to Johnson Space Center in March 1995 as an astronaut candidate." },
    { x: 80, y: 46, label: "STS-87", date: "Nov 1997", title: "First Flight — STS-87", img: "assets/images/sts87-launch.jpg", alt: "Space Shuttle Columbia lifting off on STS-87", text: "Flew as mission specialist and prime robotic arm operator aboard Columbia. 376 hours, 34 minutes in space; 252 orbits." },
    { x: 90, y: 20, label: "STS-107", date: "Jan 2003", title: "Final Flight — STS-107", img: "assets/images/sts107-launch.jpg", alt: "Space Shuttle Columbia launching on STS-107", text: "Flight engineer and mission specialist on a 16-day science mission with about 80 experiments. Columbia was lost on re-entry on 1 February 2003." },
  ];

  const sky = $(".sky");
  const skySvg = $(".sky svg");
  const panel = $(".star-panel");
  const panelImg = $("img", panel);
  const panelDate = $(".milestone-date", panel);
  const panelTitle = $("h3", panel);
  const panelText = $(".panel-text", panel);
  const skyProgress = $(".sky-progress");
  const seen = new Set();

  milestones.forEach((m, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "c-star";
    btn.style.left = `${m.x}%`;
    btn.style.top = `${m.y}%`;
    btn.setAttribute("aria-label", `${m.date}: ${m.title}`);
    btn.setAttribute("aria-controls", "starPanel");
    const label = document.createElement("span");
    label.className = "c-label";
    label.textContent = m.label;
    btn.append(label);
    const show = () => exploreStar(i, btn);
    btn.addEventListener("click", show);
    btn.addEventListener("mouseenter", show);
    btn.addEventListener("focus", show);
    sky.append(btn);
  });

  function drawLine(a, b) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", milestones[a].x);
    line.setAttribute("y1", milestones[a].y);
    line.setAttribute("x2", milestones[b].x);
    line.setAttribute("y2", milestones[b].y);
    line.setAttribute("pathLength", "100");
    line.setAttribute("vector-effect", "non-scaling-stroke");
    skySvg.append(line);
  }

  function exploreStar(i, btn) {
    const m = milestones[i];
    panelImg.src = m.img;
    panelImg.alt = m.alt;
    panelDate.textContent = m.date;
    panelTitle.textContent = m.title;
    panelText.textContent = m.text;
    if (seen.has(i)) return;
    seen.add(i);
    btn.classList.add("seen");
    if (seen.has(i - 1)) drawLine(i - 1, i);
    if (seen.has(i + 1)) drawLine(i, i + 1);
    skyProgress.textContent =
      seen.size === milestones.length
        ? "Constellation complete — her journey, written in the stars."
        : `${seen.size} of ${milestones.length} stars explored`;
  }

  /* -------------------------------------------------------
     12. Light a Star — tributes saved in localStorage
     ------------------------------------------------------- */
  const STORAGE_KEY = "kalpana-tributes";
  const form = $("#tributeForm");
  const tributeSky = $(".tribute-sky");
  const emptyMsg = $(".tribute-sky .empty");
  const msgInput = $("#tMessage");
  const charCount = $(".char-count");
  const formStatus = $("#formStatus");
  let openPopup = null;

  const loadTributes = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  };
  const saveTributes = (list) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* storage may be unavailable (private mode) */
    }
  };

  function closePopup() {
    if (openPopup) {
      openPopup.remove();
      openPopup = null;
    }
  }

  function renderTributeStar(t) {
    const star = document.createElement("button");
    star.type = "button";
    star.className = "t-star";
    star.style.left = `${t.x}%`;
    star.style.top = `${t.y}%`;
    star.setAttribute("aria-label", `Tribute from ${t.name}`);
    star.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasThis = openPopup && openPopup.dataset.id === t.id;
      closePopup();
      if (wasThis) return;
      const pop = document.createElement("div");
      pop.className = "t-popup glass";
      pop.dataset.id = t.id;
      pop.setAttribute("role", "status");
      pop.style.left = `${clamp(t.x, 18, 82)}%`;
      pop.style.top = `${Math.max(t.y, 40)}%`;
      const strong = document.createElement("strong");
      strong.textContent = t.name;
      const p = document.createElement("p");
      p.textContent = t.msg;
      pop.append(strong, p);
      tributeSky.append(pop);
      openPopup = pop;
    });
    tributeSky.append(star);
    emptyMsg.hidden = true;
  }

  loadTributes().forEach(renderTributeStar);
  tributeSky.addEventListener("click", closePopup);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePopup();
  });

  msgInput.addEventListener("input", () => {
    charCount.textContent = `${msgInput.value.length} / 200`;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#tName").value.trim();
    const msg = msgInput.value.trim();
    if (!name || !msg) {
      formStatus.textContent = "Please add your name and a short message.";
      return;
    }
    const t = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.slice(0, 40),
      msg: msg.slice(0, 200),
      x: 8 + Math.random() * 84,
      y: 10 + Math.random() * 78,
    };
    const list = loadTributes();
    list.push(t);
    saveTributes(list);
    renderTributeStar(t);
    form.reset();
    charCount.textContent = "0 / 200";
    formStatus.textContent = `Thank you, ${t.name}. Your star is now shining.`;
  });

  $("#clearTributes").addEventListener("click", () => {
    saveTributes([]);
    closePopup();
    $$(".t-star", tributeSky).forEach((s) => s.remove());
    emptyMsg.hidden = false;
    formStatus.textContent = "Tributes on this device have been cleared.";
  });
})();
