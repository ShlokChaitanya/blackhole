import { Tensor4 } from './07_TensorOperations.js';

/**
 * Module 4: Kerr-Newman Geometry
 *
 * AUDIT FINDINGS:
 *   CRITICAL BUG — Same Boyer-Lindquist singularity as Module 3 (Σ/Δ in g_rr).
 *   Additionally g_φφ formula was using the Kerr form; correct KN g_φφ must
 *   use the KN discriminant Ξ = r² + a² + (2Mr - Q²)a²sin²θ/Σ.
 *
 * FIX: Kerr-Newman metric in Kerr-Schild coordinates.
 *   H_KN(r,θ) = (Mr - Q²/2) / Σ    ← replaces H = Mr/Σ of pure Kerr
 *   Everything else follows the same Kerr-Schild decomposition.
 *   l_μ = (1, 1, 0, -a sin²θ)  (same null vector as Kerr KS)
 *
 * Explicit KS components:
 *   g_tt  = -(1 - 2H)             where 2H = (2Mr - Q²)/Σ
 *   g_tr  = 2H
 *   g_tφ  = 2H · (-a sin²θ)
 *   g_rr  = 1 + 2H
 *   g_rφ  = (1 + 2H)(-a sin²θ)   [Note sign matches BL at equator]
 *   g_θθ  = Σ
 *   g_φφ  = (r² + a²)sin²θ + 2H a²sin⁴θ
 *
 * References:
 *   Newman et al. (1965); Adamo & Newman (2014) Scholarpedia;
 *   Visser (2007) arXiv:0706.0622
 */
export function getKerrNewmanMetric(M, a, Q, r, theta) {
  const g     = new Tensor4();
  const a2    = a * a;
  const r2    = r * r;
  const Q2    = Q * Q;
  const cosT  = Math.cos(theta);
  const sinT  = Math.sin(theta);
  const sin2T = sinT * sinT;
  const Sigma = r2 + a2 * cosT * cosT;  // always > 0

  // KN Kerr-Schild scalar — no Δ in denominator
  const H     = (M * r - 0.5 * Q2) / Sigma;

  // Ingoing null 1-form components
  const lphph = -a * sin2T;

  g.set(0, 0, -1.0 + 2 * H);            // g_tt
  g.set(0, 1,  2 * H);                   // g_tr
  g.set(1, 0,  g.get(0, 1));             // g_rt
  g.set(0, 3,  2 * H * lphph);          // g_tφ
  g.set(3, 0,  g.get(0, 3));             // g_φt
  g.set(1, 1,  1.0 + 2 * H);            // g_rr
  g.set(1, 3,  2 * H * lphph);          // g_rφ  (same sign as g_tφ/g_tr ratio)
  g.set(3, 1,  g.get(1, 3));
  g.set(2, 2,  Sigma);                   // g_θθ
  g.set(3, 3,  (r2 + a2) * sin2T + 2 * H * lphph * lphph); // g_φφ

  return g;
}

/**
 * Horizon radii for Kerr-Newman.
 * Δ_KN = r² - 2Mr + a² + Q² = 0
 * r₊/₋ = M ± sqrt(M² - a² - Q²)
 */
export function getKerrNewmanHorizons(M, a, Q) {
  const discriminant = M * M - a * a - Q * Q;
  if (discriminant < 0) return null; // naked singularity
  const sqrtD = Math.sqrt(discriminant);
  return { outer: M + sqrtD, inner: M - sqrtD };
}
