/**
 * Module 17: Gravitational Redshift
 * 
 * Theory:
 * A special case of the generalized redshift formula where emitter and observer 
 * are stationary (u^i = 0). The frequency shift is purely due to the difference 
 * in gravitational potential (time dilation).
 * 
 * Equations:
 * z = (ν_em - ν_obs) / ν_obs = sqrt(-g_00(obs) / -g_00(em)) - 1
 * 
 * Implementation Strategy:
 * Extract the g_00 component of the metric at both locations. For an observer 
 * at infinity, g_00(obs) = -1.
 * 
 * Dependencies: Module 2/3 (Metrics)
 * Performance Costs: O(1)
 */

export function calculateGravitationalRedshift(g00_em, g00_obs = -1.0) {
  // Assumes signature (-+++), so g00 is negative.
  return Math.sqrt(-g00_obs / -g00_em) - 1.0;
}
