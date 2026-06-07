import { Tensor4 } from './07_TensorOperations.js';
import { computeChristoffelSymbols, computeRiemannTensor } from './08_CurvatureCalculations.js';

/**
 * Module 5: Einstein Field Equations (EFE)
 *
 * AUDIT FINDINGS:
 *   computeEinsteinTensor — pure skeleton, returned empty Tensor4 of zeros.
 *   Zero Einstein tensor is non-physical and silently incorrect.
 *
 * FIX: Full numerical implementation using Module 8 (Curvature Calculations).
 *
 * Pipeline:
 *   1.  Γ^ρ_μν   from computeChristoffelSymbols
 *   2.  R^ρ_σμν  from computeRiemannTensor
 *   3.  R_μν     = R^α_μαν   (Ricci tensor, one contraction)
 *   4.  R        = g^μν R_μν  (Ricci scalar)
 *   5.  G_μν     = R_μν − ½ R g_μν   (Einstein tensor)
 *   6.  Optional Λ term: G_μν + Λ g_μν
 *
 * For vacuum Schwarzschild/Kerr, G_μν = 0 everywhere (r > 0).
 * The numeric residual should be < ε ~ dx² ≈ 1e-8 with dx = 1e-4.
 *
 * References:
 *   MTW §21; Baumgarte & Shapiro §2.2
 */

/**
 * Compute the Ricci tensor R_μν = R^α_μαν.
 * @param {Function} metricFunc  (x) => Tensor4
 * @param {number[]} coords      4-position
 * @returns {Tensor4}            Ricci tensor (covariant)
 */
export function computeRicciTensor(metricFunc, coords, dx = 1e-4) {
  const Riemann = computeRiemannTensor(metricFunc, coords, dx);
  const Ricci   = new Tensor4();

  // R_μν = R^α_μαν  →  sum over first and third indices
  for (let mu = 0; mu < 4; mu++) {
    for (let nu = 0; nu < 4; nu++) {
      let sum = 0;
      for (let alpha = 0; alpha < 4; alpha++) {
        sum += Riemann[alpha][mu][alpha][nu];
      }
      Ricci.set(mu, nu, sum);
    }
  }
  return Ricci;
}

/**
 * Compute the Ricci scalar R = g^μν R_μν.
 */
export function computeRicciScalar(metricFunc, coords, dx = 1e-4) {
  const g_inv = metricFunc(coords).inverse();
  const Ricci  = computeRicciTensor(metricFunc, coords, dx);
  let R = 0;
  for (let mu = 0; mu < 4; mu++) {
    for (let nu = 0; nu < 4; nu++) {
      R += g_inv.get(mu, nu) * Ricci.get(mu, nu);
    }
  }
  return R;
}

/**
 * Compute the Einstein tensor G_μν = R_μν − ½ R g_μν (+ optional Λ g_μν).
 * @param {Function} metricFunc  (x) => Tensor4
 * @param {number[]} coords      4-position
 * @param {number}   Lambda      cosmological constant (default 0)
 * @returns {Tensor4}            G_μν
 */
export function computeEinsteinTensor(metricFunc, coords, Lambda = 0, dx = 1e-4) {
  const g     = metricFunc(coords);
  const Ricci = computeRicciTensor(metricFunc, coords, dx);
  const R     = computeRicciScalar(metricFunc, coords, dx);
  const G     = new Tensor4();

  for (let mu = 0; mu < 4; mu++) {
    for (let nu = 0; nu < 4; nu++) {
      G.set(mu, nu,
        Ricci.get(mu, nu)
        - 0.5 * R * g.get(mu, nu)
        + Lambda * g.get(mu, nu)
      );
    }
  }
  return G;
}

/**
 * Verify the EFE for vacuum: checks that ||G_μν|| < tolerance.
 * Returns the max absolute component (should be ~dx² for analytic metrics).
 */
export function verifyVacuumEFE(metricFunc, coords, dx = 1e-4) {
  const G = computeEinsteinTensor(metricFunc, coords, 0, dx);
  let maxAbs = 0;
  for (let i = 0; i < 16; i++) {
    maxAbs = Math.max(maxAbs, Math.abs(G.data[i]));
  }
  return maxAbs;
}
