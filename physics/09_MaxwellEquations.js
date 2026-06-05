/**
 * Module 9: Maxwell Equations in Curved Spacetime
 * 
 * Theory:
 * The covariant formulation of Maxwell's equations.
 * 
 * Equations:
 * ∇_ν F^μν = μ_0 J^μ  (Inhomogeneous)
 * ∇_[ρ F_μν] = 0      (Homogeneous, equivalent to dF = 0)
 * 
 * Implementation Strategy:
 * Establish the covariant divergence operator for rank-2 anti-symmetric tensors.
 * 
 * Dependencies: Module 7, Module 10
 * Performance Costs: O(N) over a grid.
 * Numerical Methods: Finite volume or finite difference discretization.
 */

import { Tensor4 } from './07_TensorOperations.js';

export function covariantDivergenceFaraday(F_tensor_func, x, Gamma, dx = 1e-5) {
  // Computes ∇_ν F^μν at position x
  // F_tensor_func(x) -> Tensor4 (contravariant F^μν)
  // Gamma(x) -> Array[4][4][4] (Christoffel symbols Γ^α_βγ)
  
  const J = [0, 0, 0, 0];
  const dF = [];
  
  // 1. Calculate partial derivatives ∂_ν F^μν
  // We need ∂_ν F^μν for each μ
  for (let nu = 0; nu < 4; nu++) {
    const x_plus = [...x];
    const x_minus = [...x];
    x_plus[nu] += dx;
    x_minus[nu] -= dx;
    
    const F_plus = F_tensor_func(x_plus);
    const F_minus = F_tensor_func(x_minus);
    
    const deriv_nu = new Tensor4();
    for (let i = 0; i < 16; i++) {
      deriv_nu.data[i] = (F_plus.data[i] - F_minus.data[i]) / (2 * dx);
    }
    dF.push(deriv_nu); // dF[nu] is ∂_ν F^αβ
  }
  
  const F_center = F_tensor_func(x);
  const G = Gamma(x);
  
  for (let mu = 0; mu < 4; mu++) {
    // Term 1: ∂_ν F^μν
    let partial_div = 0;
    for (let nu = 0; nu < 4; nu++) {
      partial_div += dF[nu].get(mu, nu);
    }
    
    // Term 2: Γ^ν_νσ F^μσ
    // (Note: Γ^μ_στ F^στ = 0 because Γ is symmetric and F is anti-symmetric)
    let connection_term = 0;
    for (let sigma = 0; sigma < 4; sigma++) {
      for (let nu = 0; nu < 4; nu++) {
        connection_term += G[nu][nu][sigma] * F_center.get(mu, sigma);
      }
    }
    
    J[mu] = partial_div + connection_term;
  }
  
  return J; // Returns current 4-vector J^μ (multiplied by μ_0)
}
