import { Tensor4 } from './07_TensorOperations.js';

/**
 * Module 3: Kerr Geometry
 * 
 * Theory:
 * The Kerr metric describes the geometry of empty spacetime around a rotating uncharged 
 * axially-symmetric black hole. It introduces frame-dragging (Lense-Thirring effect).
 * 
 * Equations (Boyer-Lindquist coordinates):
 * a = J/M  (spin parameter)
 * Σ = r^2 + a^2 cos^2(θ)
 * Δ = r^2 - 2Mr + a^2
 * 
 * g_tt = -(1 - 2Mr/Σ)
 * g_tφ = g_φt = -2Mra sin^2(θ)/Σ
 * g_rr = Σ/Δ
 * g_θθ = Σ
 * g_φφ = (r^2 + a^2 + 2Mra^2 sin^2(θ)/Σ) sin^2(θ)
 * 
 * Implementation Strategy:
 * Evaluate the exact Kerr metric given (M, a, r, θ). 'a' is constrained such that |a| <= M.
 * 
 * Dependencies: Module 7 (TensorOperations)
 * Performance Costs: O(1), trigonometric functions.
 * Numerical Methods: Analytic evaluation.
 */

export function getKerrMetric(M, a, r, theta) {
  const g = new Tensor4();
  const a2 = a * a;
  const r2 = r * r;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const sin2T = sinT * sinT;
  
  const Sigma = r2 + a2 * cosT * cosT;
  const Delta = r2 - 2 * M * r + a2;

  // Covariant metric tensor g_μν
  g.set(0, 0, -(1.0 - (2 * M * r) / Sigma));
  g.set(0, 3, -(2 * M * r * a * sin2T) / Sigma);
  g.set(3, 0, g.get(0, 3)); // Symmetric
  
  g.set(1, 1, Sigma / Delta);
  g.set(2, 2, Sigma);
  g.set(3, 3, (r2 + a2 + (2 * M * r * a2 * sin2T) / Sigma) * sin2T);

  return g;
}
