// ── Web Vitals: Core performance tracking (Google standard) ──────────────────
// Reports LCP, FID, CLS, INP, TTFB via PerformanceObserver.

type Metric = { name: string; value: number; rating: 'good' | 'needs-improvement' | 'poor' };

const thresholds: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
};

function rate(name: string, value: number): Metric['rating'] {
  const t = thresholds[name];
  if (!t) return 'good';
  if (value <= t[0]) return 'good';
  if (value <= t[1]) return 'needs-improvement';
  return 'poor';
}

function report(name: string, value: number) {
  const metric: Metric = { name, value: Math.round(value * 100) / 100, rating: rate(name, value) };

  // Log only in dev or for poor metrics in prod
  if (!import.meta.env.PROD || metric.rating === 'poor') {
    console.log(`[WebVitals] ${metric.name}: ${metric.value} (${metric.rating})`);
  }

  // Store in window for diagnostics (accessible via window.__sarelliVitals)
  if (typeof window !== 'undefined') {
    (window as any).__sarelliVitals = (window as any).__sarelliVitals || {};
    (window as any).__sarelliVitals[name] = metric;
  }
}

export function initWebVitals() {
  if (typeof PerformanceObserver === 'undefined') return;

  // LCP
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      if (last) report('LCP', last.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}

  // FID
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        report('FID', (entry as any).processingStart - entry.startTime);
      }
    }).observe({ type: 'first-input', buffered: true });
  } catch {}

  // CLS
  try {
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      report('CLS', clsValue);
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}

  // TTFB
  try {
    new PerformanceObserver((list) => {
      const nav = list.getEntries()[0] as PerformanceNavigationTiming;
      if (nav) report('TTFB', nav.responseStart - nav.requestStart);
    }).observe({ type: 'navigation', buffered: true });
  } catch {}

  // INP (Interaction to Next Paint)
  try {
    let maxINP = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = (entry as any).duration;
        if (duration > maxINP) {
          maxINP = duration;
          report('INP', duration);
        }
      }
    }).observe({ type: 'event', buffered: true });
  } catch {}
}
