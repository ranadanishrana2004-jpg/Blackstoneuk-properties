'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Seasonal falling-snow overlay, modelled on the festive menu-board look:
 *
 * - A dense, glittering band of icy-blue snow along the top edge (round flakes, little
 *   hearts, four-point stars and tiny snowflakes) that slowly drifts down and melts away.
 * - Small white flakes that break off and fall gently all the way down the page.
 *
 * Safety:
 * - One fixed <canvas>, pointer-events: none, so it never blocks clicks, scrolling or forms.
 * - Sits above the sticky header (z-index 40) but below dialogs and menus (z-index 50).
 * - Turns itself off outside the season window below, on /manage, for users who prefer
 *   reduced motion, and pauses while the tab is hidden.
 * - Fewer flakes on small screens; frame rate independent; capped device pixel ratio;
 *   every shape is pre-rendered once, so each frame is only cheap image copies.
 *
 * To switch it off early, set SNOW_ENABLED to false (or delete <Snowfall /> from app/layout.tsx).
 */
const SNOW_ENABLED = true;
// Month is 1-12. The window wraps over New Year: 15 Nov to 6 Jan inclusive.
const SEASON_START = { month: 11, day: 15 };
const SEASON_END = { month: 1, day: 6 };
const HIDDEN_ON = ['/manage'];

// Positioning lives inline so the overlay never depends on the global stylesheet
// (the production CSS bundle once shipped without the .snowfall rule).
const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  width: '100%',
  height: '100%',
  zIndex: 45,
  pointerEvents: 'none',
  userSelect: 'none',
};

const ICE = '#a8d0f6'; // icy blue of the reference snow
const SNOW = '#ffffff';
// A faint cool outline keeps the snow readable on the site's cream background.
const OUTLINE = 'rgba(120,145,185,0.45)';

function inSeason(now: Date) {
  const value = (now.getMonth() + 1) * 100 + now.getDate();
  const start = SEASON_START.month * 100 + SEASON_START.day;
  const end = SEASON_END.month * 100 + SEASON_END.day;
  return start <= end ? value >= start && value <= end : value >= start || value <= end;
}

type Shape = 'dot' | 'heart' | 'star' | 'flake' | 'speck';

type Flake = {
  shape: Shape;
  band: boolean; // part of the glittering top band (fades out) or a long faller
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  phase: number;
  sway: number;
  alpha: number;
  angle: number;
  spin: number;
  fadeFrom: number;
  fadeTo: number;
};

const SPRITE = 64;

function sprite(draw: (ctx: CanvasRenderingContext2D, r: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SPRITE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.translate(SPRITE / 2, SPRITE / 2);
  draw(ctx, SPRITE * 0.38);
  return canvas;
}

/** Fill a path in icy blue with a thin cool outline and a soft white highlight. */
function paint(ctx: CanvasRenderingContext2D, r: number, path: () => void, color = ICE) {
  ctx.lineJoin = 'round';
  path();
  ctx.lineWidth = r * 0.16;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.shadowColor = 'rgba(255,255,255,0.8)';
  ctx.shadowBlur = r * 0.25;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;
  const hi = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, -r * 0.3, -r * 0.3, r * 0.8);
  hi.addColorStop(0, 'rgba(255,255,255,0.75)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  ctx.fill();
}

function makeSprites() {
  const dot = sprite((ctx, r) =>
    paint(ctx, r, () => {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    }),
  );
  const speck = sprite((ctx, r) =>
    paint(
      ctx,
      r,
      () => {
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      },
      SNOW,
    ),
  );
  const heart = sprite((ctx, r) =>
    paint(ctx, r, () => {
      ctx.beginPath();
      ctx.moveTo(0, r * 0.85);
      ctx.bezierCurveTo(-r * 1.15, 0, -r * 0.75, -r * 0.95, 0, -r * 0.4);
      ctx.bezierCurveTo(r * 0.75, -r * 0.95, r * 1.15, 0, 0, r * 0.85);
      ctx.closePath();
    }),
  );
  const star = sprite((ctx, r) =>
    paint(ctx, r, () => {
      // Soft four-point star, like the twinkles in the reference.
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 - Math.PI / 2;
        const b = a + Math.PI / 4;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.quadraticCurveTo(
          Math.cos(b) * r * 0.18,
          Math.sin(b) * r * 0.18,
          Math.cos(a + Math.PI / 2) * r,
          Math.sin(a + Math.PI / 2) * r,
        );
      }
      ctx.closePath();
    }),
  );
  const flake = sprite((ctx, r) => {
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      ctx.moveTo(0, 0);
      ctx.lineTo(ca * r, sa * r);
      // one pair of side branches per arm
      const bx = ca * r * 0.55;
      const by = sa * r * 0.55;
      for (const side of [-1, 1]) {
        const b = a + side * 0.75;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(b) * r * 0.3, by + Math.sin(b) * r * 0.3);
      }
    }
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = r * 0.3;
    ctx.stroke();
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = r * 0.2;
    ctx.strokeStyle = ICE;
    ctx.lineWidth = r * 0.17;
    ctx.stroke();
  });
  if (!dot || !speck || !heart || !star || !flake) return null;
  return { dot, speck, heart, star, flake };
}

function pickBandShape(): Shape {
  const roll = Math.random();
  if (roll < 0.58) return 'dot';
  if (roll < 0.74) return 'heart';
  if (roll < 0.88) return 'star';
  return 'flake';
}

export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname() ?? '/';
  const hidden = !SNOW_ENABLED || HIDDEN_ON.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (hidden || !canvas || !inSeason(new Date())) return;
    const ctx = canvas.getContext('2d');
    const sprites = makeSprites();
    if (!ctx || !sprites) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const band: Flake[] = [];
    const fallers: Flake[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let last = 0;

    // Band flakes sit along the top edge, drift down slowly and melt away.
    const spawnBand = (initial: boolean): Flake => {
      const shape = pickBandShape();
      const small = width < 640;
      const size =
        (shape === 'dot' ? 4 + Math.random() * 7 : 7 + Math.random() * 8) * (small ? 0.8 : 1);
      const reach = (small ? 70 : 110) + Math.random() * (small ? 90 : 150);
      const fadeFrom = reach * (0.25 + Math.random() * 0.35);
      return {
        shape,
        band: true,
        x: Math.random() * width,
        // Start biased to the very top so the band looks densest at the edge.
        y: initial ? Math.pow(Math.random(), 1.8) * reach - size : -size - Math.random() * 30,
        size,
        speed: 10 + Math.random() * 20,
        drift: (Math.random() - 0.5) * 6,
        phase: Math.random() * Math.PI * 2,
        sway: 0.3 + Math.random() * 0.6,
        alpha: 0.75 + Math.random() * 0.25,
        angle: shape === 'heart' ? (Math.random() - 0.5) * 0.6 : Math.random() * Math.PI * 2,
        spin: shape === 'flake' || shape === 'star' ? (Math.random() - 0.5) * 0.5 : 0,
        fadeFrom,
        fadeTo: reach,
      };
    };

    // Small white flakes that fall gently down the whole page.
    const spawnFaller = (initial: boolean): Flake => {
      const depth = Math.random();
      const size = 3 + depth * 5;
      return {
        shape: 'speck',
        band: false,
        x: Math.random() * width,
        y: initial ? Math.random() * height : -size - Math.random() * 40,
        size,
        speed: 45 + depth * 65,
        drift: (Math.random() - 0.5) * 12,
        phase: Math.random() * Math.PI * 2,
        sway: 0.4 + Math.random() * 0.8,
        alpha: 0.65 + depth * 0.35,
        angle: 0,
        spin: 0,
        fadeFrom: Infinity,
        fadeTo: Infinity,
      };
    };

    const fill = (list: Flake[], target: number, make: (initial: boolean) => Flake) => {
      if (list.length > target) list.length = target;
      while (list.length < target) list.push(make(true));
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      // About 60 band flakes + 80 fallers on a phone, up to 240 + 250 on a wide desktop.
      fill(band, Math.round(Math.min(240, Math.max(60, width / 6))), spawnBand);
      fill(fallers, Math.round(Math.min(250, Math.max(80, (width * height) / 4500))), spawnFaller);
    };

    const step = (f: Flake, dt: number) => {
      f.phase += dt * f.sway;
      f.y += f.speed * dt;
      f.x += (f.drift + Math.sin(f.phase) * (f.band ? 6 : 14)) * dt;
      f.angle += f.spin * dt;
      if (f.x < -20) f.x = width + 20;
      else if (f.x > width + 20) f.x = -20;
    };

    const render = (f: Flake) => {
      let alpha = f.alpha;
      if (f.band && f.y > f.fadeFrom) {
        alpha *= Math.max(0, 1 - (f.y - f.fadeFrom) / (f.fadeTo - f.fadeFrom));
      }
      if (alpha <= 0.01) return;
      ctx.globalAlpha = alpha;
      const s = f.size / 0.76; // the drawn shape spans ~76% of its sprite box
      if (f.angle) {
        const cos = Math.cos(f.angle) * dpr;
        const sin = Math.sin(f.angle) * dpr;
        ctx.setTransform(cos, sin, -sin, cos, f.x * dpr, f.y * dpr);
        ctx.drawImage(sprites[f.shape], -s / 2, -s / 2, s, s);
      } else {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.drawImage(sprites[f.shape], f.x - s / 2, f.y - s / 2, s, s);
      }
    };

    const draw = (time: number) => {
      const dt = Math.min((time - last) / 1000, 0.05) || 0;
      last = time;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < fallers.length; i++) {
        const f = fallers[i];
        step(f, dt);
        if (f.y - f.size > height) fallers[i] = spawnFaller(false);
        else render(f);
      }
      for (let i = 0; i < band.length; i++) {
        const f = band[i];
        step(f, dt);
        if (f.y > f.fadeTo) band[i] = spawnBand(false);
        else render(f);
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    const start = () => {
      if (frame || motion.matches || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(draw);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const sync = () => {
      if (motion.matches) {
        stop();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else if (document.hidden) stop();
      else start();
    };

    resize();
    sync();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    return () => {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
    };
  }, [hidden]);

  if (hidden) return null;
  return <canvas ref={canvasRef} className="snowfall" style={OVERLAY_STYLE} aria-hidden="true" />;
}
