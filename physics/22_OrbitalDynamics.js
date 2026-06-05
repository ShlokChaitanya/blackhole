/**
 * Module 22: Orbital Dynamics
 * 
 * Theory:
 * Exact analytical description of orbits in Kerr and Schwarzschild spacetimes.
 * Exploits constants of motion (Energy E, Angular Momentum L_z, Carter constant Q) 
 * to determine orbital properties without numerical integration.
 * 
 * Equations:
 * V_eff(r) for Kerr:
 * R(r) = (E(r^2 + a^2) - a L_z)^2 - Δ(r^2 + (L_z - a E)^2 + Q)
 * Roots of R(r), R'(r) = 0 determine stable circular orbits.
 * 
 * Implementation Strategy:
 * Calculate the Innermost Stable Circular Orbit (ISCO), Photon Sphere, and 
 * Marginally Bound Orbit (MBO) by finding roots of the effective potential derivative.
 * 
 * Dependencies: None (purely analytic expressions).
 * Performance Costs: O(1).
 * Numerical Methods: Root finding (Newton-Raphson) or analytic Bardeen formulas.
 */

export function calculateISCO(M, a) {
  // Bardeen, Press, and Teukolsky (1972) formula for ISCO in Kerr metric
  const a_norm = a / M;
  const Z1 = 1 + Math.cbrt(1 - a_norm * a_norm) * (Math.cbrt(1 + a_norm) + Math.cbrt(1 - a_norm));
  const Z2 = Math.sqrt(3 * a_norm * a_norm + Z1 * Z1);
  
  const sign_pro = 1;
  const sign_retro = -1;
  
  const r_isco_pro = M * (3 + Z2 - sign_pro * Math.sqrt((3 - Z1) * (3 + Z1 + 2 * Z2)));
  const r_isco_retro = M * (3 + Z2 - sign_retro * Math.sqrt((3 - Z1) * (3 + Z1 + 2 * Z2)));
  
  return { prograde: r_isco_pro, retrograde: r_isco_retro };
}

export function calculatePhotonSphere(M, a) {
  const a_norm = a / M;
  
  // Prograde and retrograde photon sphere radii
  const r_photon_pro = 2 * M * (1 + Math.cos((2/3) * Math.acos(-a_norm)));
  const r_photon_retro = 2 * M * (1 + Math.cos((2/3) * Math.acos(a_norm)));
  
  return { prograde: r_photon_pro, retrograde: r_photon_retro };
}

export function calculateMBO(M, a) {
  const a_norm = a / M;
  
  // Marginally bound orbit radii
  const r_mbo_pro = 2 * M - a + 2 * Math.sqrt(M * (M - a));
  const r_mbo_retro = 2 * M + a + 2 * Math.sqrt(M * (M + a));
  
  return { prograde: r_mbo_pro, retrograde: r_mbo_retro };
}
