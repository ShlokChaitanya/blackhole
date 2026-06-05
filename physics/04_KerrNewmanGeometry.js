import { Tensor4 } from './07_TensorOperations.js';

/**
 * Module 4: Kerr-Newman Geometry
 * 
 * Theory:
 * Kerr-Newman geometry extends the Kerr metric to include an electric charge Q.
 * The presence of charge alters the horizons and the Δ term.
 * 
 * Equations:
 * r_Q^2 = Q^2 / (4π ε_0 G)  [in geometric units, simply Q^2]
 * Δ = r^2 - 2Mr + a^2 + Q^2
 * 
 * Implementation Strategy:
 * Extend the Kerr metric evaluation by introducing Q into the Δ and g_tt, g_tφ components.
 * 
 * Dependencies: Module 3 (implicitly conceptually), Module 7.
 * Performance Costs: O(1)
 * Numerical Methods: Analytic evaluation.
 */

export function getKerrNewmanMetric(M, a, Q, r, theta) {
  const g = new Tensor4();
  const a2 = a * a;
  const r2 = r * r;
  const Q2 = Q * Q;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const sin2T = sinT * sinT;
  
  const Sigma = r2 + a2 * cosT * cosT;
  const Delta = r2 - 2 * M * r + a2 + Q2;

  g.set(0, 0, -(1.0 - (2 * M * r - Q2) / Sigma));
  g.set(0, 3, -((2 * M * r - Q2) * a * sin2T) / Sigma);
  g.set(3, 0, g.get(0, 3));
  
  g.set(1, 1, Sigma / Delta);
  g.set(2, 2, Sigma);
  
  const term = (r2 + a2) * (r2 + a2) - Delta * a2 * sin2T;
  g.set(3, 3, (term / Sigma) * sin2T);

  return g;
}
