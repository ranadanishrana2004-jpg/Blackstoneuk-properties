'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Seasonal falling-snow overlay.
 *
 * Three kinds of flake, layered by depth: soft round "bokeh" snow (most of them),
 * six-armed crystal snowflakes that slowly turn, and small twinkling sparkles.
 *
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
// (the production CSS bundle shipped without the .snowfall rule).
const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  width: '100%',
  height: '100%',
  zIndex: 45,
  pointerEvents: 'none',
  userSelect: 'none',
};

// A faint cool edge keeps white snow readable on the site's cream background.
const EDGE = 'rgba(140,160,190,';

function inSeason(now: Date) {
  const value = (now.getMonth() + 1) * 100 + now.getDate();
  const start = SEASON_START.month * 100 + SEASON_START.day;
  const end = SEASON_END.month * 100 + SEASON_END.day;
  return start <= end ? value >= start && value <= end : value >= start || value <= end;
}

type Kind = 'dot' | 'crystal' | 'sparkle';

type Flake = {
  kind: Kind;
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
  twinkle: number;
};

function newCanvas(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d') };
}

/** Soft round snow with a bright core: reads as bokeh when drawn large. */
function makeDot(size: number) {
  const { canvas, ctx } = newCanvas(size);
  if (!ctx) return null;
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.62, EDGE + '0.4)');
  g.addColorStop(1, EDGE + '0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Six-armed crystal snowflake with side branches and a soft glow. */
function makeCrystal(size: number) {
  const { canvas, ctx } = newCanvas(size);
  if (!ctx) return null;
  const c = size / 2;
  const arm = size * 0.4;
  ctx.translate(c, c);
  ctx.lineCap = 'round';
  const drawArms = () => {
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -arm);
      for (const [at, len] of [
        [0.45, 0.22],
        [0.7, 0.16],
      ]) {
        ctx.moveTo(0, -arm * at);
        ctx.lineTo(-arm * len, -arm * (at + len));
        ctx.moveTo(0, -arm * at);
        ctx.lineTo(arm * len, -arm * (at + len));
      }
      ctx.stroke();
      ctx.restore();
    }
  };
  // Outer cool outline, then the white crystal on top.
  ctx.strokeStyle = EDGE + '0.45)';
  ctx.lineWidth = size * 0.07;
  drawArms();
  ctx.shadowColor = 'rgba(255,255,255,0.9)';
  ctx.shadowBlur = size * 0.08;
  ctx.strokeStyle = 'rgba(255,255,255,1)';
  ctx.lineWidth = size * 0.035;
  drawArms();
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  return canvas;
}

/** Four-point twinkle with a warm glow, like light catching the snow. */
function makeSparkle(size: number) {
  const { canvas, ctx } = newCanvas(size);
  if (!ctx) return null;
  const c = size / 2;
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c * 0.6);
  glow.addColorStop(0, 'rgba(255,244,214,0.9)');
  glow.addColorStop(1, 'rgba(255,236,200,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  ctx.translate(c, c);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(255,240,205,1)';
  ctx.shadowBlur = size * 0.1;
  ctx.beginPath();
  const long = size * 0.46;
  const thin = size * 0.06;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const b = a + Math.PI / 4;
    ctx.lineTo(Math.cos(a) * long, Math.sin(a) * long);
    ctx.lineTo(Math.cos(b) * thin, Math.sin(b) * thin);
  }
  ctx.closePath();
  ctx.fill();
  return canvas;
}

export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname() ?? '/';
  const hidden = !SNOW_ENABLED || HIDDEN_ON.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (hidden || !canvas || !inSeason(new Date())) return;
    const ctx = canvas.getContext('2d');
    const dotSprite = makeDot(64);
    const crystalSprite = makeCrystal(96);
    const sparkleSprite = makeSparkle(64);
    if (!ctx || !dotSprite || !crystalSprite || !sparkleSprite) return;
    const sprites = { dot: dotSprite, crystal: crystalSprite, sparkle: sparkleSprite };

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const flakes: Flake[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;

    const spawn = (anywhere: boolean): Flake => {
      const roll = Math.random();
      const kind: Kind = roll < 0.12 ? 'crystal' : roll < 0.2 ? 'sparkle' : 'dot';
      const depth = Math.random(); // 0 = far, 1 = near
      const size =
        kind === 'crystal'
          ? 10 + depth * 14
          : kind === 'sparkle'
            ? 7 + depth * 9
            : 3 + depth * depth * 11; // a few big, soft bokeh flakes up close
      return {
        kind,
        x: Math.random() * width,
        y: anywhere ? Math.random() * height : -size,
        size,
        speed: (kind === 'crystal' ? 20 : 24) + depth * 46, // px per second
        drift: (Math.random() - 0.5) * 14,
        phase: Math.random() * Math.PI * 2,
        sway: 0.4 + Math.random() * 0.8,
        alpha: kind === 'dot' ? 0.4 + depth * 0.5 - (depth > 0.85 ? 0.25 : 0) : 0.75 + depth * 0.25,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.9,
        twinkle: 1.5 + Math.random() * 2.5,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Density scales with screen area: roughly 45 flakes on a phone, up to 150 on desktop.
      const target = Math.round(Math.min(150, Math.max(40, (width * height) / 8000)));
      if (flakes.length > target) flakes.length = target;
      while (flakes.length < target) flakes.push(spawn(true));
    };

    const draw = (time: number) => {
      const dt = Math.min((time - last) / 1000, 0.05) || 0;
      last = time;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const dpr = canvas.width / (width || 1);
      for (const f of flakes) {
        f.phase += dt * f.sway;
        f.y += f.speed * dt;
        f.x += (f.drift + Math.sin(f.phase) * 16) * dt;
        f.angle += f.spin * dt;
        if (f.y - f.size > height) Object.assign(f, spawn(false));
        if (f.x < -20) f.x = width + 20;
        else if (f.x > width + 20) f.x = -20;

        let alpha = f.alpha;
        if (f.kind === 'sparkle')
          alpha *= 0.35 + 0.65 * Math.abs(Math.sin((time / 1000) * f.twinkle + f.phase));
        ctx.globalAlpha = alpha;
        const s = f.kind === 'dot' ? f.size * 2.2 : f.size * 2;
        if (f.kind === 'dot') {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.drawImage(sprites.dot, f.x - s / 2, f.y - s / 2, s, s);
        } else {
          const cos = Math.cos(f.angle) * dpr;
          const sin = Math.sin(f.angle) * dpr;
          ctx.setTransform(cos, sin, -sin, cos, f.x * dpr, f.y * dpr);
          ctx.drawImage(sprites[f.kind], -s / 2, -s / 2, s, s);
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
        ctx.clearRect(0, 0, width, height);
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
