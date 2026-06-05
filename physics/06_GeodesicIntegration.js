/**
 * Module 6: Geodesic Integration
 * 
 * Theory:
 * Geodesics are the straightest possible paths in curved spacetime. Particles follow
 * timelike geodesics, while photons follow null geodesics.
 * 
 * Equations:
 * Hamiltonian: H = 1/2 g^μν p_μ p_ν
 * Hamilton's Equations:
 * dx^μ / dλ = ∂H / ∂p_μ = g^μν p_ν
 * dp_μ / dλ = -∂H / ∂x^μ = -1/2 (∂_μ g^αβ) p_α p_β
 * 
 * Implementation Strategy:
 * Instead of integrating the second-order geodesic equation with Christoffel symbols,
 * we use the Hamiltonian formulation. This naturally leads to symplectic integration 
 * methods (like implicit midpoint or velocity Verlet) which conserve the Hamiltonian H 
 * and thus conserve invariant mass exactly.
 * 
 * Dependencies: Metric tensor implementations (Modules 2, 3).
 * Performance Costs: O(1) per step. Very fast if analytic derivatives of the metric are known.
 * Numerical Methods: 4th-order Runge-Kutta-Fehlberg (RK45) or Symplectic Integrator.
 */

import { Tensor4 } from './07_TensorOperations.js';

export class GeodesicIntegrator {
  /**
   * @param {Function} metricFunc (x) => Tensor4 (covariant metric g_μν)
   */
  constructor(metricFunc) {
    this.metricFunc = metricFunc;
  }

  // Numerically compute derivatives of the inverse metric: ∂_μ g^αβ
  _getInverseMetricDerivatives(x, dx = 1e-5) {
    const inv_g_center = this.metricFunc(x).inverse();
    const dInvG_dx = [];
    
    for (let mu = 0; mu < 4; mu++) {
      const x_plus = [...x];
      const x_minus = [...x];
      
      x_plus[mu] += dx;
      x_minus[mu] -= dx;
      
      const inv_g_plus = this.metricFunc(x_plus).inverse();
      const inv_g_minus = this.metricFunc(x_minus).inverse();
      
      const deriv = new Tensor4();
      for (let i = 0; i < 16; i++) {
        deriv.data[i] = (inv_g_plus.data[i] - inv_g_minus.data[i]) / (2 * dx);
      }
      dInvG_dx.push(deriv);
    }
    
    return { inv_g: inv_g_center, dInvG: dInvG_dx };
  }

  // Evaluates Hamilton's equations: dx^μ/dλ and dp_μ/dλ
  _evaluateHamiltonian(x, p) {
    const { inv_g, dInvG } = this._getInverseMetricDerivatives(x);
    
    const dx_dlambda = [0, 0, 0, 0];
    const dp_dlambda = [0, 0, 0, 0];
    
    // dx^μ / dλ = g^μν p_ν
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = 0; nu < 4; nu++) {
        dx_dlambda[mu] += inv_g.get(mu, nu) * p[nu];
      }
    }
    
    // dp_μ / dλ = -1/2 (∂_μ g^αβ) p_α p_β
    for (let mu = 0; mu < 4; mu++) {
      let sum = 0;
      const dG = dInvG[mu];
      for (let alpha = 0; alpha < 4; alpha++) {
        for (let beta = 0; beta < 4; beta++) {
          sum += dG.get(alpha, beta) * p[alpha] * p[beta];
        }
      }
      dp_dlambda[mu] = -0.5 * sum;
    }
    
    return { dx: dx_dlambda, dp: dp_dlambda };
  }

  // Perform a single RK4 step
  step(x, p, dlambda) {
    // k1
    const { dx: k1_x, dp: k1_p } = this._evaluateHamiltonian(x, p);
    
    // k2
    const x2 = x.map((xi, i) => xi + 0.5 * dlambda * k1_x[i]);
    const p2 = p.map((pi, i) => pi + 0.5 * dlambda * k1_p[i]);
    const { dx: k2_x, dp: k2_p } = this._evaluateHamiltonian(x2, p2);
    
    // k3
    const x3 = x.map((xi, i) => xi + 0.5 * dlambda * k2_x[i]);
    const p3 = p.map((pi, i) => pi + 0.5 * dlambda * k2_p[i]);
    const { dx: k3_x, dp: k3_p } = this._evaluateHamiltonian(x3, p3);
    
    // k4
    const x4 = x.map((xi, i) => xi + dlambda * k3_x[i]);
    const p4 = p.map((pi, i) => pi + dlambda * k3_p[i]);
    const { dx: k4_x, dp: k4_p } = this._evaluateHamiltonian(x4, p4);
    
    // Update
    const next_x = [0, 0, 0, 0];
    const next_p = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      next_x[i] = x[i] + (dlambda / 6.0) * (k1_x[i] + 2 * k2_x[i] + 2 * k3_x[i] + k4_x[i]);
      next_p[i] = p[i] + (dlambda / 6.0) * (k1_p[i] + 2 * k2_p[i] + 2 * k3_p[i] + k4_p[i]);
    }
    
    return { x: next_x, p: next_p }; 
  }
}

