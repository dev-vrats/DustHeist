// Global Liquid Ripple Effect
// Automatically attaches to ALL button/[role=button] clicks across the app

export function initRipple() {
  document.addEventListener('pointerdown', (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('button, [role="button"], a[class*="btn"], .btn-primary, .btn-secondary, .btn-accent, .btn-danger') as HTMLElement | null;
    if (!btn) return;

    // Don't ripple if disabled
    if (btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true') return;

    // Ensure relative positioning
    const computed = window.getComputedStyle(btn);
    if (computed.position === 'static') {
      btn.style.position = 'relative';
    }
    btn.style.overflow = 'hidden';

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(178,213,229,0.35) 0%, rgba(178,213,229,0.12) 40%, transparent 70%);
      transform: scale(0);
      pointer-events: none;
      z-index: 9999;
      animation: _ripple_anim 550ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;

    btn.appendChild(ripple);

    ripple.addEventListener('animationend', () => ripple.remove());
  });

  // Inject keyframe once
  if (!document.getElementById('__ripple_style__')) {
    const style = document.createElement('style');
    style.id = '__ripple_style__';
    style.textContent = `
      @keyframes _ripple_anim {
        0%   { transform: scale(0); opacity: 1; }
        60%  { transform: scale(1); opacity: 0.6; }
        100% { transform: scale(1.05); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
