/**
 * DustHeist — Realistic Liquid Bubble Click Effect
 * Creates real-looking water/soap bubbles at the click point,
 * with specular highlights, refraction rings, and floating micro-bubbles.
 */

interface BubbleOptions {
  x: number;
  y: number;
  container: HTMLElement;
}

function createBubble({ x, y, container }: BubbleOptions) {
  // ── Main Bubble ────────────────────────────────────────────
  const bubble = document.createElement('span');
  const size = 80 + Math.random() * 40; // 80–120px

  bubble.style.cssText = `
    position: absolute;
    left: ${x - size / 2}px;
    top: ${y - size / 2}px;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    background: radial-gradient(
      circle at 35% 35%,
      rgba(255,255,255,0.55) 0%,
      rgba(127,181,204,0.18) 30%,
      rgba(127,181,204,0.08) 55%,
      rgba(95,160,185,0.22) 70%,
      rgba(127,181,204,0.05) 85%,
      transparent 100%
    );
    border: 1px solid rgba(127,181,204,0.5);
    box-shadow:
      inset 0 0 12px rgba(127,181,204,0.25),
      inset 2px 2px 6px rgba(255,255,255,0.35),
      0 0 18px rgba(127,181,204,0.2),
      0 0 4px rgba(255,255,255,0.15);
    transform: scale(0) translateZ(0);
    animation: bubbleExpand 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    will-change: transform, opacity;
  `;

  // ── Inner Specular Highlight (bright spot — real bubble look) ─
  const highlight = document.createElement('span');
  highlight.style.cssText = `
    position: absolute;
    top: 12%;
    left: 18%;
    width: 28%;
    height: 20%;
    border-radius: 50%;
    background: radial-gradient(
      ellipse at center,
      rgba(255,255,255,0.9) 0%,
      rgba(255,255,255,0.4) 50%,
      transparent 100%
    );
    filter: blur(1px);
    pointer-events: none;
  `;
  bubble.appendChild(highlight);

  // ── Secondary bottom highlight ─────────────────────────────
  const highlight2 = document.createElement('span');
  highlight2.style.cssText = `
    position: absolute;
    bottom: 15%;
    right: 20%;
    width: 16%;
    height: 10%;
    border-radius: 50%;
    background: radial-gradient(
      ellipse at center,
      rgba(127,181,204,0.6) 0%,
      transparent 100%
    );
    filter: blur(2px);
    pointer-events: none;
  `;
  bubble.appendChild(highlight2);

  container.appendChild(bubble);

  // Remove after animation
  bubble.addEventListener('animationend', () => bubble.remove(), { once: true });

  return bubble;
}

function createRippleRing({ x, y, container }: BubbleOptions, delay = 0) {
  // Outer expanding ring (like water surface ripple)
  const ring = document.createElement('span');
  const size = 20;

  ring.style.cssText = `
    position: absolute;
    left: ${x - size / 2}px;
    top: ${y - size / 2}px;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9998;
    border: 1.5px solid rgba(127,181,204,0.6);
    box-shadow: 0 0 8px rgba(127,181,204,0.2);
    transform: scale(0) translateZ(0);
    animation: rippleRing 650ms cubic-bezier(0.2, 0.8, 0.4, 1) ${delay}ms forwards;
    will-change: transform, opacity;
  `;

  container.appendChild(ring);
  ring.addEventListener('animationend', () => ring.remove(), { once: true });
}

function createMicroBubble({ x, y, container }: BubbleOptions) {
  // Tiny satellite bubbles that scatter from click point
  const count = 4 + Math.floor(Math.random() * 4); // 4–7 micro bubbles

  for (let i = 0; i < count; i++) {
    const micro = document.createElement('span');
    const size = 4 + Math.random() * 8; // 4–12px
    const angle = (i / count) * 360 + Math.random() * 30;
    const distance = 24 + Math.random() * 36;
    const dx = Math.cos((angle * Math.PI) / 180) * distance;
    const dy = Math.sin((angle * Math.PI) / 180) * distance;
    const delay = Math.random() * 80;
    const duration = 400 + Math.random() * 300;

    micro.style.cssText = `
      position: absolute;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 9997;
      background: radial-gradient(
        circle at 35% 30%,
        rgba(255,255,255,0.85) 0%,
        rgba(127,181,204,0.3) 40%,
        rgba(127,181,204,0.12) 70%,
        transparent 100%
      );
      border: 0.5px solid rgba(127,181,204,0.45);
      box-shadow: inset 1px 1px 2px rgba(255,255,255,0.5), 0 0 4px rgba(127,181,204,0.15);
      opacity: 0;
      animation: microBubble ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms forwards;
      --dx: ${dx}px;
      --dy: ${dy}px;
      will-change: transform, opacity;
    `;

    container.appendChild(micro);
    micro.addEventListener('animationend', () => micro.remove(), { once: true });
  }
}

function injectStyles() {
  if (document.getElementById('__bubble_styles__')) return;

  const style = document.createElement('style');
  style.id = '__bubble_styles__';
  style.textContent = `
    @keyframes bubbleExpand {
      0%   { transform: scale(0) translateZ(0); opacity: 0; }
      15%  { opacity: 1; }
      60%  { transform: scale(1) translateZ(0); opacity: 0.85; }
      100% { transform: scale(1.15) translateZ(0); opacity: 0; }
    }

    @keyframes rippleRing {
      0%   { transform: scale(0.5) translateZ(0); opacity: 0.8; }
      100% { transform: scale(6) translateZ(0); opacity: 0; }
    }

    @keyframes microBubble {
      0%   { transform: translate(0, 0) scale(0); opacity: 0; }
      20%  { opacity: 1; transform: translate(calc(var(--dx) * 0.3), calc(var(--dy) * 0.3)) scale(1); }
      70%  { opacity: 0.7; transform: translate(var(--dx), var(--dy)) scale(0.9); }
      100% { opacity: 0; transform: translate(calc(var(--dx) * 1.2), calc(var(--dy) * 1.2)) scale(0); }
    }
  `;
  document.head.appendChild(style);
}

export function initRipple() {
  injectStyles();

  document.addEventListener('pointerdown', (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    const btn = target.closest(
      'button, [role="button"], .btn-primary, .btn-secondary, .btn-accent, .btn-danger, a[href]'
    ) as HTMLElement | null;

    if (!btn) return;
    if (btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true') return;

    // Ensure correct positioning context
    const pos = window.getComputedStyle(btn).position;
    if (pos === 'static') btn.style.position = 'relative';
    btn.style.overflow = 'hidden';

    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const opts: BubbleOptions = { x, y, container: btn };

    // Layer 1: main liquid bubble
    createBubble(opts);

    // Layer 2: outer water surface ripple rings (2 rings with slight delay)
    createRippleRing(opts, 0);
    createRippleRing(opts, 100);

    // Layer 3: scattered micro-bubbles
    createMicroBubble(opts);
  });
}
