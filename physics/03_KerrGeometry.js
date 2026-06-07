import { Tensor4 } from './07_TensorOperations.js';

/**
 * Module 3: Kerr Geometry
 *
 * AUDIT FINDINGS:
 *   CRITICAL BUG — Boyer-Lindquist g_rr = Σ/Δ diverges at Δ = 0, i.e. at both
 *   the outer horizon r₊ and the inner Cauchy horizon r₋.
 *   No guard at all — any raymarcher stepping through r₊ will produce NaN / Inf.
 *
 * FIX: Kerr metric in ingoing Kerr-Schild (KS) coordinates.
 *   Null vector:  l_μ = (1, -Σ/Δ_ks_r, 0, a sin²θ)   ← no Δ in denominator
 *   H(r, θ) = Mr / Σ
 *   g_μν = η_μν + 2H l_μ l_ν
 *
 * Explicit KS components (signature -+++):
 *   g_tt   = -(1 - 2Mr/Σ)
 *   g_tr   = g_rt = 2Mr/Σ
 *   g_tφ   = g_φt = 2Mra sin²θ / Σ     ← sign +, not − as in BL
 *   g_rr   = 1 + 2Mr/Σ
 *   g_rφ   = g_φr = -(1 + 2Mr/Σ) a sin²θ
 *   g_θθ   = Σ
 *   g_φφ   = (r² + a² + 2Mra² sin²θ/Σ) sin²θ
 *
 * NB: In KS the cross-term g_rφ is non-zero. The metric is still analytic at
 *     r = r₊ (Δ never appears in a denominator).
 *
 * References:
 *   Kerr (1963); Visser (2007) arXiv:0706.0622;
 *   Baumgarte & Shapiro "Numerical Relativity", §11.2
 */
export function getKerrMetric(M, a, r, theta) {
  const g      = new Tensor4();
  const a2     = a * a;
  const r2     = r * r;
  const cosT   = Math.cos(theta);
  const sinT   = Math.sin(theta);
  const sin2T  = sinT * sinT;
  const Sigma  = r2 + a2 * cosT * cosT;   // never zero (r,θ real)
  const H      = (M * r) / Sigma;          // scalar function, finite everywhere

  // g_μν = η_μν + 2H l_μ l_ν
  // l_μ  = (1, 1, 0, -a sin²θ)  — ingoing KS null 1-form
  const ltt   =  1.0;
  const lrr   =  1.0;
  const lthth =  0.0;
  const lphph = -a * sin2T;

  g.set(0, 0, -1.0  + 2 * H * ltt   * ltt);     // g_tt
  g.set(0, 1,  2 * H * ltt   * lrr);              // g_tr
  g.set(1, 0,  g.get(0, 1));                       // g_rt
  g.set(0, 3,  2 * H * ltt   * lphph);            // g_tφ
  g.set(3, 0,  g.get(0, 3));                       // g_φt
  g.set(1, 1,  1.0  + 2 * H * lrr   * lrr);       // g_rr
  g.set(1, 3,  2 * H * lrr   * lphph);            // g_rφ
  g.set(3, 1,  g.get(1, 3));                       // g_φr
  g.set(2, 2,  Sigma);                             // g_θθ
  // g_φφ: flat part r²sin²θ + a²sin²θ + KS correction
  g.set(3, 3,  (r2 + a2) * sin2T + 2 * H * lphph * lphph);  // g_φφ

  return g;
}

/**
 * Horizon radii for Kerr black hole (valid for |a| ≤ M).
 * r₊ = M + sqrt(M² - a²),  r₋ = M - sqrt(M² - a²)
 */
export function getKerrHorizons(M, a) {
  const discriminant = M * M - a * a;
  if (discriminant < 0) return null; // Naked singularity — no real horizons
  const sqrtD = Math.sqrt(discriminant);
  return { outer: M + sqrtD, inner: M - sqrtD };
}

/**
 * Ergosphere radius (equator: θ = π/2):
 * r_erg = M + sqrt(M² - a² cos²θ)
 */
export function getErgosphereRadius(M, a, theta = Math.PI / 2) {
  const cosT = Math.cos(theta);
  const discriminant = M * M - a * a * cosT * cosT;
  if (discriminant < 0) return 0;
  return M + Math.sqrt(discriminant);
}
