/**
 * Module 16: Relativistic Doppler Effects
 * 
 * Theory:
 * The observed frequency of light depends on the relative motion of the emitter 
 * and observer within the curved spacetime.
 * 
 * Equations:
 * g = ν_obs / ν_em = (p_μ u^μ)_obs / (p_μ u^μ)_em
 * where p_μ is the photon 4-momentum and u^μ is the 4-velocity of the observer/emitter.
 * 
 * Implementation Strategy:
 * Compute the invariant inner product at both the emission event and observation event.
 * 
 * Dependencies: Module 7 (TensorOperations for inner product)
 * Performance Costs: O(1)
 * Numerical Methods: Algebraic tensor contraction.
 */

export function calculateDopplerFactor(p_em, u_em, p_obs, u_obs, g_em, g_obs) {
  // 1. Lower the photon 4-momentum using the metric at emission
  const p_cov_em = g_em.lowerVector(p_em);
  
  // E_em = - p_μ u^μ
  let E_em = 0;
  for (let i = 0; i < 4; i++) {
    E_em -= p_cov_em[i] * u_em[i];
  }
  
  // 2. Lower the photon 4-momentum using the metric at observation
  const p_cov_obs = g_obs.lowerVector(p_obs);
  
  // E_obs = - p_μ u^μ
  let E_obs = 0;
  for (let i = 0; i < 4; i++) {
    E_obs -= p_cov_obs[i] * u_obs[i];
  }
  
  // 3. g = E_obs / E_em
  if (E_em === 0) return 0;
  return E_obs / E_em; 
}
