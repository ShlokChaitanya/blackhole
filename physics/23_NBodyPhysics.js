/**
 * Module 23: N-body Physics
 * 
 * Theory:
 * The dynamics of multiple masses interacting gravitationally in GR.
 * 
 * Equations:
 * Einstein-Infeld-Hoffmann (EIH) equations (Post-Newtonian expansion up to 2.5PN).
 * a_i = a_i^(0) + a_i^(1PN) + a_i^(2PN) + a_i^(2.5PN)
 * The 2.5PN term introduces radiation reaction (orbital decay due to GW emission).
 * 
 * Implementation Strategy:
 * Replace the simple Runge-Kutta PN integrators in the React app with a robust 
 * N-body EIH integrator.
 * 
 * Dependencies: Module 7
 * Performance Costs: O(N^2)
 * Numerical Methods: Symplectic integrator or high-order implicit RK.
 */

import { CONSTANTS } from './01_GeneralRelativity.js';

export class EIHIntegrator {
  constructor(masses, positions, velocities) {
    this.masses = masses;
    this.positions = positions; // Array of [x, y, z]
    this.velocities = velocities; // Array of [vx, vy, vz]
    this.N = masses.length;
  }
  
  _calculateAccelerations(pos, vel) {
    const acc = Array(this.N).fill(0).map(() => [0, 0, 0]);
    const c2 = CONSTANTS.c * CONSTANTS.c;
    const G = CONSTANTS.G;

    for (let i = 0; i < this.N; i++) {
      for (let j = 0; j < this.N; j++) {
        if (i === j) continue;

        const r_vec = [
          pos[i][0] - pos[j][0],
          pos[i][1] - pos[j][1],
          pos[i][2] - pos[j][2]
        ];
        
        const r2 = r_vec[0]*r_vec[0] + r_vec[1]*r_vec[1] + r_vec[2]*r_vec[2];
        const r = Math.sqrt(r2);
        const n = [r_vec[0]/r, r_vec[1]/r, r_vec[2]/r];
        
        const v_i2 = vel[i][0]*vel[i][0] + vel[i][1]*vel[i][1] + vel[i][2]*vel[i][2];
        const v_j2 = vel[j][0]*vel[j][0] + vel[j][1]*vel[j][1] + vel[j][2]*vel[j][2];
        const vi_dot_vj = vel[i][0]*vel[j][0] + vel[i][1]*vel[j][1] + vel[i][2]*vel[j][2];
        
        const vj_dot_n = vel[j][0]*n[0] + vel[j][1]*n[1] + vel[j][2]*n[2];
        const vi_dot_n = vel[i][0]*n[0] + vel[i][1]*n[1] + vel[i][2]*n[2];

        // Newtonian part
        const a_newton = -(G * this.masses[j]) / r2;
        
        // 1PN Correction terms
        let potential_term = 0;
        for (let k = 0; k < this.N; k++) {
          if (k !== i) {
            const rik = Math.sqrt(Math.pow(pos[i][0]-pos[k][0], 2) + Math.pow(pos[i][1]-pos[k][1], 2) + Math.pow(pos[i][2]-pos[k][2], 2));
            potential_term += (G * this.masses[k]) / rik;
          }
          if (k !== j) {
            const rjk = Math.sqrt(Math.pow(pos[j][0]-pos[k][0], 2) + Math.pow(pos[j][1]-pos[k][1], 2) + Math.pow(pos[j][2]-pos[k][2], 2));
            potential_term += (G * this.masses[k]) / rjk;
          }
        }

        const pn_term1 = v_i2 + 2.0 * v_j2 - 4.0 * vi_dot_vj - 1.5 * (vj_dot_n * vj_dot_n) - 4.0 * potential_term;
        const pn_term2 = 4.0 * vi_dot_n - 3.0 * vj_dot_n;
        
        const v_diff = [
          vel[i][0] - vel[j][0],
          vel[i][1] - vel[j][1],
          vel[i][2] - vel[j][2]
        ];

        for (let dim = 0; dim < 3; dim++) {
          acc[i][dim] += a_newton * n[dim] * (1.0 + pn_term1 / c2) + a_newton * (pn_term2 / c2) * v_diff[dim];
        }
      }
    }
    return acc;
  }

  step(dt) {
    // Basic Euler step for brevity, RK4 is preferred for production
    const acc = this._calculateAccelerations(this.positions, this.velocities);
    
    for (let i = 0; i < this.N; i++) {
      for (let dim = 0; dim < 3; dim++) {
        this.velocities[i][dim] += acc[i][dim] * dt;
        this.positions[i][dim] += this.velocities[i][dim] * dt;
      }
    }
  }
}
