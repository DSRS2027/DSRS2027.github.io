// Background line-art: a PneuNet bending actuator, a soft gripper and an octopus tentacle.
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Pose of a point s along a constant-curvature beam (bends toward +y, i.e. "down").
  function pose(s, k) {
    if (Math.abs(k) < 1e-6) return { x: s, y: 0, t: 0 };
    const t = k * s;
    return { x: Math.sin(t) / k, y: (1 - Math.cos(t)) / k, t };
  }

  // Build (or update) a PneuNet actuator inside group g. p = inflation 0..1.
  function pneunet(g, p, o) {
    const { n = 9, w = 34, gap = 10, hb = 16, hc = 46, kmax = 0.0068 } = o;
    const L = n * (w + gap) + gap;
    const k = p * kmax;
    g.replaceChildren();

    // strain-limiting base layer
    const top = [], bot = [];
    for (let i = 0; i <= 40; i++) {
      const q = pose((L * i) / 40, k);
      const nx = Math.sin(q.t), ny = -Math.cos(q.t);
      top.push(`${(q.x + nx * hb / 2).toFixed(1)},${(q.y + ny * hb / 2).toFixed(1)}`);
      bot.push(`${(q.x - nx * hb / 2).toFixed(1)},${(q.y - ny * hb / 2).toFixed(1)}`);
    }
    g.append(el("polygon", { points: top.concat(bot.reverse()).join(" "), class: "pn-base" }));

    // inflatable chambers
    const bulge = 1 + 0.22 * p;
    for (let i = 0; i < n; i++) {
      const s = gap + w / 2 + i * (w + gap);
      const q = pose(s, k);
      const nx = Math.sin(q.t), ny = -Math.cos(q.t);
      const cx = q.x + nx * hb / 2, cy = q.y + ny * hb / 2;
      const cw = w * bulge, ch = hc * (1 + 0.12 * p);
      const r = Math.min(cw / 2, 8 + 10 * p);
      g.append(el("rect", {
        x: -cw / 2, y: -ch, width: cw, height: ch, rx: r,
        transform: `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${(q.t * 180 / Math.PI).toFixed(2)})`,
        class: "pn-chamber",
      }));
    }
    // air supply tube at the fixed end
    g.append(el("path", { d: `M0 ${-hb / 2 - 10} C -40 -20 -60 40 -140 30`, class: "pn-tube" }));
  }

  // 1) Hero: one large actuator that slowly inflates and curls.
  const hero = document.getElementById("deco-actuator");
  if (hero) {
    // anchored at the right edge, pointing left, curling upward
    const svg = el("svg", { viewBox: "-440 -300 600 380", class: "deco-svg" });
    const g = el("g", { transform: "rotate(180)" });
    svg.append(g);
    hero.append(svg);
    if (reduceMotion) pneunet(g, 0.65, {});
    else {
      const t0 = performance.now();
      const tick = (now) => {
        const p = (1 - Math.cos(((now - t0) / 6000) * 2 * Math.PI)) / 2; // 6 s breathing cycle
        pneunet(g, p, {});
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  // 2) Key info: two-finger soft gripper closing around an egg.
  const grip = document.getElementById("deco-gripper");
  if (grip) {
    const svg = el("svg", { viewBox: "-260 -60 520 520", class: "deco-svg" });
    const egg = el("ellipse", { cx: 0, cy: 205, rx: 74, ry: 94, class: "egg" });
    const palm = el("rect", { x: -160, y: -40, width: 320, height: 44, rx: 14, class: "pn-base" });
    const fl = el("g", {}), fr = el("g", {});
    svg.append(egg, palm, fl, fr);
    grip.append(svg);
    const opts = { n: 7, w: 26, gap: 8, hb: 12, hc: 34, kmax: 0.0029 };
    const draw = (p) => {
      // fingers hang down from the palm; chambers face outward so they curl inward
      pneunet(fl, p, opts);
      pneunet(fr, p, opts);
      fl.setAttribute("transform", "translate(-132 4) rotate(90) scale(1 -1)");
      fr.setAttribute("transform", "translate(132 4) rotate(90)");
      fl.querySelector(".pn-tube").remove();
      fr.querySelector(".pn-tube").remove();
    };
    if (reduceMotion) draw(1);
    else {
      const t0 = performance.now();
      const tick = (now) => {
        const ph = ((now - t0) / 7000) % 1;               // close, hold, open, rest
        const p = ph < .3 ? ph / .3 : ph < .6 ? 1 : ph < .9 ? 1 - (ph - .6) / .3 : 0;
        draw((1 - Math.cos(p * Math.PI)) / 2);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  // 3) About: an octopus tentacle rising from the bottom edge, its tip curling inward.
  const tent = document.getElementById("deco-tentacle");
  if (tent) {
    // integrate a curvature profile that tightens toward the tip (clothoid-like curl)
    const L = 420, N = 220, ds = L / N;
    const pts = [];
    let x = 0, y = 0, th = -Math.PI / 2;            // start pointing straight up
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      pts.push({ x, y, th, w: 46 * Math.pow(1 - u, 0.9) + 3, k: 0 });
      const k = -0.004 + 0.075 * Math.pow(u, 4);
      th += k * ds; x += Math.cos(th) * ds; y += Math.sin(th) * ds;
    }
    const left = [], right = [];
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const P of pts) {
      P.nx = -Math.sin(P.th); P.ny = Math.cos(P.th);  // points toward the inside of the curl
      const a = [P.x + P.nx * P.w / 2, P.y + P.ny * P.w / 2], b = [P.x - P.nx * P.w / 2, P.y - P.ny * P.w / 2];
      left.push(a.map(v => v.toFixed(1)).join(",")); right.push(b.map(v => v.toFixed(1)).join(","));
      for (const [px, py] of [a, b]) { minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py); }
    }
    const pad = 10;
    const svg = el("svg", { viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`, class: "deco-svg" });
    svg.append(el("polygon", { points: left.concat(right.reverse()).join(" "), class: "tentacle" }));
    for (let i = 6; i < pts.length - 12; i += 7) {
      const P = pts[i];
      svg.append(el("circle", {
        cx: (P.x + P.nx * P.w * 0.27).toFixed(1), cy: (P.y + P.ny * P.w * 0.27).toFixed(1),
        r: Math.max(2.5, P.w * 0.2).toFixed(1), class: "sucker",
      }));
    }
    tent.append(svg);
  }
})();
