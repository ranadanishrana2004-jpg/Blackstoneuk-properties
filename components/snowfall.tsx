'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Seasonal falling-snow overlay.
 *
 * - One fixed <canvas>, pointer-events: none, so it never blocks clicks, scrolling or forms.
 * - Sits above the sticky header (z-index 40) but below dialogs and menus (z-index 50).
 * - Turns itself off outside the season window below, on /manage, for users who prefer
 *   reduced motion, and pauses while the tab is hidden.
 * - Fewer flakes on small screens; frame rate independent; capped device pixel ratio.
 *
 * To switch it off early, set SNOW_ENABLED to false (or delete <Snowfall /> from app/layout.tsx).
 */
const SNOW_ENABLED = true;
// Month is 1-12. The window wraps over New Year: 15 Nov to 6 Jan inclusive.
const SEASON_START = { month: 11, day: 15 };
const SEASON_END = { month: 1, day: 6 };
const HIDDEN_ON = ['/manage'];

function inSeason(now: Date) {
  const value = (now.getMonth() + 1) * 100 + now.getDate();
  const start = SEASON_START.month * 100 + SEASON_START.day;
  const end = SEASON_END.month * 100 + SEASON_END.day;
  return start <= end ? value >= start && value <= end : value >= start || value <= end;
}

type Flake = {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  phase: number;
  sway: number;
  alpha: number;
};

/** Pre-renders one soft, slightly outlined flake so it reads on light and dark backgrounds. */
function makeSprite(size: number) {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext('2d');
  if (!ctx) return null;
  const c = size / 2;
  // Faint cool halo keeps white flakes visible on the cream background.
  const halo = ctx.createRadialGradient(c, c, 0, c, c, c);
  halo.addColorStop(0, 'rgba(255,255,255,1)');
  halo.addColorStop(0.5, 'rgba(255,255,255,0.9)');
  halo.addColorStop(0.75, 'rgba(160,178,204,0.35)');
  halo.addColorStop(1, 'rgba(160,178,204,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}

export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathname = usePathname() ?? '/';
  const hidden = !SNOW_ENABLED || HIDDEN_ON.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (hidden || !canvas || !inSeason(new Date())) return;
    const ctx = canvas.getContext('2d');
    const sprite = makeSprite(64);
    if (!ctx || !sprite) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const flakes: Flake[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;

    const spawn = (anywhere: boolean): Flake => {
      const depth = Math.random(); // 0 = far, 1 = near
      return {
        x: Math.random() * width,
        y: anywhere ? Math.random() * height : -10,
        r: 1.5 + depth * depth * 4,
        speed: 22 + depth * 48, // px per second
        drift: (Math.random() - 0.5) * 12,
        phase: Math.random() * Math.PI * 2,
        sway: 0.4 + Math.random() * 0.8,
        alpha: 0.45 + depth * 0.5,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Density scales with screen area: roughly 40 flakes on a phone, up to 130 on desktop.
      const target = Math.round(Math.min(130, Math.max(35, (width * height) / 9000)));
      if (flakes.length > target) flakes.length = target;
      while (flakes.length < target) flakes.push(spawn(true));
    };

    const draw = (time: number) => {
      const dt = Math.min((time - last) / 1000, 0.05) || 0;
      last = time;
      ctx.clearRect(0, 0, width, height);
      for (const f of flakes) {
        f.phase += dt * f.sway;
        f.y += f.speed * dt;
        f.x += (f.drift + Math.sin(f.phase) * 14) * dt;
        if (f.y - f.r * 2 > height) Object.assign(f, spawn(false));
        if (f.x < -10) f.x = width + 10;
        else if (f.x > width + 10) f.x = -10;
        const d = f.r * 2.6;
        ctx.globalAlpha = f.alpha;
        ctx.drawImage(sprite, f.x - d / 2, f.y - d / 2, d, d);
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
  return <canvas ref={canvasRef} className="snowfall" aria-hidden="true" />;
}
