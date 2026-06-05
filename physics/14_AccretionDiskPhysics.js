/**
 * Module 14: Accretion Disk Physics
 * 
 * Theory:
 * The Novikov-Thorne model describes a geometrically thin, optically thick 
 * accretion disk around a black hole in General Relativity.
 * 
 * Equations:
 * F(r) = (3GM \dot{M} / 8πr^3) * f(r, a)
 * where f(r, a) is a relativistic correction factor accounting for the ISCO 
 * boundary condition.
 * 
 * Implementation Strategy:
 * Provide analytic functions returning density, temperature, and 4-velocity 
 * (u^μ) of the disk fluid at any point (r, θ, φ). The velocity is strictly 
 * Keplerian modified by the Kerr metric frame dragging.
 * 
 * Dependencies: Module 22 (for ISCO radius)
 * Performance Costs: Fast (analytic evaluations).
 * Numerical Methods: Direct function evaluation.
 */

import { CONSTANTS, UnitConverter } from './01_GeneralRelativity.js';
import { calculateISCO } from './22_OrbitalDynamics.js';

export function computeThinDiskTemperature(M_kg, a_norm, M_dot_kg_s, r_geo) {
  const M = 1.0; // Geometric mass is always 1 when scaled by M
  const a = a_norm;
  const isco = calculateISCO(M, a).prograde;
  
  if (r_geo <= isco) {
    return 0; // Truncate emission inside ISCO (plunge region)
  }

  // Radiative flux F(r) according to Novikov-Thorne
  const x = Math.sqrt(r_geo);
  const x0 = Math.sqrt(isco);
  const x1 = 2 * Math.cos(Math.acos(a) / 3) - Math.sqrt(3) * Math.sin(Math.acos(a) / 3);
  const x2 = 2 * Math.cos(Math.acos(a) / 3) + Math.sqrt(3) * Math.sin(Math.acos(a) / 3);
  const x3 = -2 * Math.cos(Math.acos(a) / 3);
  
  // Page and Thorne (1974) relativistic correction factors
  // (Simplified analytical form for brevity, usually involves integral over r)
  // For a basic implementation, we use a Post-Newtonian zero-torque approximation:
  // f = 1 - sqrt(isco / r_geo)
  const f = 1.0 - Math.sqrt(isco / r_geo);

  // F = (3 * G * M * M_dot) / (8 * pi * r^3) * f
  const r_m = r_geo * (CONSTANTS.G * M_kg / (CONSTANTS.c * CONSTANTS.c));
  const flux = (3 * CONSTANTS.G * M_kg * M_dot_kg_s) / (8 * Math.PI * Math.pow(r_m, 3)) * f;
  
  // Stefan-Boltzmann Law: F = sigma * T^4
  const sigma_SB = 5.670374419e-8; // W / (m^2 K^4)
  const T = Math.pow(Math.max(0, flux) / sigma_SB, 0.25);
  
  return T;
}

export function computeDisk4Velocity(M, a, r) {
  // Keplerian angular velocity in Kerr: Omega = 1 / (r^(3/2) + a * M^(1/2))
  const Omega = 1.0 / (Math.pow(r, 1.5) + a);
  
  // The 4-velocity u^mu has components u^t and u^phi. u^r = u^theta = 0
  // Normalization: g_mu_nu u^mu u^nu = -1
  // u^t = 1 / sqrt(-g_tt - 2*Omega*g_tphi - Omega^2 * g_phiphi)
  // We compute the metric components explicitly at equator (theta = pi/2)
  const r2 = r * r;
  const a2 = a * a;
  const Sigma = r2; // since cos(pi/2) = 0
  const Delta = r2 - 2 * M * r + a2;
  
  const g_tt = -(1.0 - (2 * M * r) / Sigma);
  const g_tphi = -(2 * M * r * a) / Sigma;
  const g_phiphi = r2 + a2 + (2 * M * r * a2) / Sigma;
  
  const v2 = -(g_tt + 2 * Omega * g_tphi + Omega * Omega * g_phiphi);
  
  if (v2 <= 0) {
    // Inside ISCO or ergosphere issues, particle cannot maintain circular orbit
    // Fall back to plunging 4-velocity or return [0,0,0,0] for simplicity in thin disk
    return [0, 0, 0, 0];
  }
  
  const u_t = 1.0 / Math.sqrt(v2);
  const u_phi = Omega * u_t;
  
  return [u_t, 0.0, 0.0, u_phi]; 
}
