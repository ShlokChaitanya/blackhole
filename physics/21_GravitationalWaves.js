/**
 * Module 21: Gravitational Waves
 * 
 * Theory:
 * Accelerating masses with a quadrupole moment emit ripples in spacetime curvature.
 * 
 * Equations:
 * h_ij^TT(t, r) = (2G / rc^4) * d^2/dt^2 [ I_ij^TT(t - r/c) ]
 * 
 * Implementation Strategy:
 * For the binary inspiral simulation, implement a Phenomenological (IMR) waveform 
 * generator for h_+(t) and h_x(t) strains, including inspiral, merger, and ringdown phases.
 * 
 * Dependencies: Module 23 (N-body trajectories)
 * Performance Costs: O(1) for analytic waveform evaluation.
 * Numerical Methods: Analytic waveform templates (e.g. IMRPhenomD).
 */

import { CONSTANTS } from './01_GeneralRelativity.js';

export function generateGravitationalWaveform(masses, positions_history, distance_r, dt) {
  // positions_history: Array of time steps, each containing Array of N positions [x,y,z]
  const G = CONSTANTS.G;
  const c4 = Math.pow(CONSTANTS.c, 4);
  const h_plus = [];
  const h_cross = [];
  
  const I_xx = [];
  const I_yy = [];
  const I_xy = [];

  // Calculate Quadrupole Moments at each time step
  for (let t = 0; t < positions_history.length; t++) {
    const pos = positions_history[t];
    let ixx = 0, iyy = 0, ixy = 0;
    
    for (let i = 0; i < masses.length; i++) {
      const m = masses[i];
      const x = pos[i][0];
      const y = pos[i][1];
      const z = pos[i][2];
      const r2 = x*x + y*y + z*z;
      
      ixx += m * (x*x - 1.0/3.0 * r2);
      iyy += m * (y*y - 1.0/3.0 * r2);
      ixy += m * (x*y);
    }
    
    I_xx.push(ixx);
    I_yy.push(iyy);
    I_xy.push(ixy);
  }

  // Calculate second derivatives using central finite difference
  // We skip the first and last time steps for boundary reasons
  const dt2 = dt * dt;
  for (let t = 1; t < positions_history.length - 1; t++) {
    const d2I_xx = (I_xx[t+1] - 2*I_xx[t] + I_xx[t-1]) / dt2;
    const d2I_yy = (I_yy[t+1] - 2*I_yy[t] + I_yy[t-1]) / dt2;
    const d2I_xy = (I_xy[t+1] - 2*I_xy[t] + I_xy[t-1]) / dt2;
    
    // Strain for a face-on observer (emitted along Z-axis)
    // h_+ = G / (r c^4) * (d^2/dt^2 I_xx - d^2/dt^2 I_yy)
    // h_x = 2G / (r c^4) * d^2/dt^2 I_xy
    const coef = G / (distance_r * c4);
    
    h_plus.push(coef * (d2I_xx - d2I_yy));
    h_cross.push(coef * 2.0 * d2I_xy);
  }

  return { h_plus, h_cross };
}
