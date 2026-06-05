import { Tensor4 } from './07_TensorOperations.js';

/**
 * Module 2: Schwarzschild Geometry
 * 
 * Theory:
 * The Schwarzschild metric is the exact solution to the Einstein Field Equations 
 * for a spherically symmetric, non-rotating, uncharged mass.
 * 
 * Equations:
 * ds^2 = -(1 - 2M/r) dt^2 + (1 - 2M/r)^-1 dr^2 + r^2 dθ^2 + r^2 sin^2(θ) dφ^2
 * 
 * Implementation Strategy:
 * Given coordinates (t, r, θ, φ) and a black hole mass M (in geometric units), 
 * return the covariant metric tensor g_μν as a Tensor4 object.
 * 
 * Dependencies: Module 7 (TensorOperations)
 * Performance Costs: O(1)
 * Numerical Methods: Analytic evaluation.
 */

export function getSchwarzschildMetric(M, r, theta) {
  const g = new Tensor4();
  const rs = 2 * M; // Schwarzschild radius
  
  if (r <= rs) throw new Error("r must be greater than event horizon radius");

  g.set(0, 0, -(1.0 - rs / r));
  g.set(1, 1, 1.0 / (1.0 - rs / r));
  g.set(2, 2, r * r);
  g.set(3, 3, r * r * Math.sin(theta) * Math.sin(theta));
  
  return g;
}
