// Background line-art: an octopus tentacle.
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };

  // About: an octopus tentacle rising from the bottom edge, its tip curling inward.
  const tent = document.getElementById("deco-tentacle");
  if (tent) {
    // integrate a curvature profile that tightens toward the tip (clothoid-like curl)
    const L = 420, N = 220, ds = L / N;
    const pts = [];
    let x = 0, y = 0, th = -Math.PI / 2;            // start pointing straight up
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      pts.push({ x, y, th, w: 46 * Math.pow(1 - u, 0.9) + 3 });
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
