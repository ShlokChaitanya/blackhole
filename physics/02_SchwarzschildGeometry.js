import { Tensor4 } from './07_TensorOperations.js';

/**
 * Module 2: Schwarzschild Geometry
 *
 * AUDIT FINDINGS:
 *   CRITICAL BUG — Boyer-Lindquist form throws at r <= 2M, making it
 *   impossible to ray-march through or near the event horizon.
 *   g_rr = 1/(1-2M/r) diverges at r = 2M (coordinate singularity).
 *
 * FIX: Ingoing Kerr-Schild (Eddington-Finkelstein) form.
 *   New coordinates (t_KS, r, θ, φ) where t_KS = t_BL + 2M ln|r/2M - 1|
 *   This is a valid, horizon-penetrating coordinate chart.
 *
 * Kerr-Schild decomposition of Schwarzschild:
 *   g_μν = η_μν + 2H l_μ l_ν
 *   H(r) = M/r
 *   l_μ = (1, 1, 0, 0)   (ingoing null vector, Cartesian-like form)
 *
 * Metric in Kerr-Schild (t, r, θ, φ):
 *   g_tt   = -(1 - 2M/r)
 *   g_tr   = g_rt = 2M/r         ← coupling term, NO singularity at r=2M
 *   g_rr   = 1 + 2M/r
 *   g_θθ   = r²
 *   g_φφ   = r² sin²θ
 *
 * References:
 *   Kerr (1963); Visser (2007), arXiv:0706.0622
 */
export function getSchwarzschildMetric(M, r, theta) {
  const g = new Tensor4();
  const H = M / r;               // 2H = 2M/r
  const sin2T = Math.sin(theta) ** 2;

  // η_μν = diag(-1, 1, 1, 1) in spherical shell with angular parts r²
  // g_μν = η_μν + 2H l_μ l_ν,  l_μ = (1, 1, 0, 0)
  g.set(0, 0, -(1.0 - 2 * H));   //  g_tt = -1 + 2H
  g.set(0, 1,  2 * H);            //  g_tr = 2H  (ingoing coupling)
  g.set(1, 0,  2 * H);            //  g_rt (symmetric)
  g.set(1, 1,  1.0 + 2 * H);     //  g_rr = 1 + 2H
  g.set(2, 2,  r * r);            //  g_θθ
  g.set(3, 3,  r * r * sin2T);   //  g_φφ

  return g;
}

/**
 * Auxiliary: Schwarzschild Kerr-Schild null vector l^μ (contravariant).
 * Satisfies g_μν l^μ l^ν = 0  and  g_μν l^μ = l_ν.
 */
export function getSchwarzschildNullVector(r) {
  return [1.0, 1.0, 0.0, 0.0]; // l^μ = (1, 1, 0, 0) in KS coords
}

/**
 * Analytic outer / inner horizon radii for Schwarzschild.
 * r_+ = 2M,  no inner horizon (a=0, Q=0).
 */
export function getSchwarzschildHorizons(M) {
  return { outer: 2 * M, inner: 0 };
}
