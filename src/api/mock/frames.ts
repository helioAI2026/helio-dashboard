/**
 * Deterministic SVG placeholders for the infra-red camera frame and the facial
 * landmark overlay shown in the alert detail drawer. No external image assets.
 */

function hash(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 320;
const H = 240;

export function irFrameSvg(id: string): string {
  const rand = hash(id + ":ir");
  const cx = W / 2 + (rand() - 0.5) * 30;
  const cy = H / 2 + (rand() - 0.5) * 24;
  const grain = Array.from({ length: 90 }, () => {
    const x = rand() * W;
    const y = rand() * H;
    const o = (0.02 + rand() * 0.06).toFixed(3);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(rand() * 1.4).toFixed(1)}" fill="#fff" opacity="${o}"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="f" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#c9d3da"/>
      <stop offset="45%" stop-color="#7f8b93"/>
      <stop offset="100%" stop-color="#0c1116"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#0c1116"/>
  <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="78" ry="98" fill="url(#f)"/>
  <ellipse cx="${(cx - 26).toFixed(1)}" cy="${(cy - 14).toFixed(1)}" rx="13" ry="7" fill="#05080b" opacity="0.75"/>
  <ellipse cx="${(cx + 26).toFixed(1)}" cy="${(cy - 14).toFixed(1)}" rx="13" ry="7" fill="#05080b" opacity="0.75"/>
  <path d="M ${(cx - 12).toFixed(1)} ${(cy + 34).toFixed(1)} q 12 10 24 0" stroke="#05080b" stroke-width="3" fill="none" opacity="0.6"/>
  ${grain}
  <rect width="${W}" height="${H}" fill="none" stroke="#1b2228" stroke-width="2"/>
</svg>`;
}

export function landmarksSvg(id: string): string {
  const rand = hash(id + ":lm");
  const cx = W / 2 + (rand() - 0.5) * 30;
  const cy = H / 2 + (rand() - 0.5) * 24;
  const accent = "#34d399";

  const pt = (x: number, y: number) =>
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.7" fill="${accent}"/>`;

  const jaw = Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI * (0.15 + (i / 10) * 0.7);
    return pt(cx - Math.cos(a) * 74, cy + Math.sin(a) * 96 - 8);
  }).join("");

  const eye = (ex: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2;
      return pt(ex + Math.cos(a) * 14, cy - 14 + Math.sin(a) * 7);
    }).join("");

  const nose = Array.from({ length: 4 }, (_, i) => pt(cx, cy - 8 + i * 9)).join("");

  const mouth = Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI * (i / 7);
    return pt(cx - 16 + i * 4.5, cy + 34 + Math.sin(a) * 6);
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="transparent"/>
  <g opacity="0.95">${jaw}${eye(cx - 26)}${eye(cx + 26)}${nose}${mouth}</g>
</svg>`;
}
