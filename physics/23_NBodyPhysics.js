import { CONSTANTS } from './01_GeneralRelativity.js';

/**
 * Module 23: N-Body Physics (Einstein-Infeld-Hoffmann equations)
 *
 * AUDIT FINDINGS:
 *   CRITICAL BUG — step() used a first-order Euler integration scheme.
 *   For a binary black hole orbit, Euler integration is catastrophically
 *   unstable: energy is NOT conserved, and the orbit will spiral inward or
 *   outward on a timescale of ~10 orbital periods regardless of step size.
 *
 * FIX: Replace with 4th-order Runge-Kutta (RK4).
 *   For production, a symplectic integrator (e.g. Yoshida 6th-order) would
 *   be preferred, but RK4 is a safe minimum for correctness.
 *   Orbital energy error per step: O(dt⁵) vs O(dt²) for Euler.
 *
 * References:
 *   Einstein, Infeld & Hoffmann (1938); Will (2014) arXiv:1409.7871;
 *   Blanchet (2014) Living Rev. Rel. 17:2
 */
export class EIHIntegrator {
  constructor(masses, positions, velocities) {
    this.masses     = masses;
    this.positions  = positions.map(p => [...p]);
    this.velocities = velocities.map(v => [...v]);
    this.N          = masses.length;
    this.time       = 0;
  }

  /** Compute 1PN EIH accelerations for all particles. */
  _calculateAccelerations(pos, vel) {
    const acc = Array.from({ length: this.N }, () => [0, 0, 0]);
    const c2  = CONSTANTS.c * CONSTANTS.c;
    const G   = CONSTANTS.G;

    for (let i = 0; i < this.N; i++) {
      for (let j = 0; j < this.N; j++) {
        if (i === j) continue;

        const dx = pos[i][0] - pos[j][0];
        const dy = pos[i][1] - pos[j][1];
        const dz = pos[i][2] - pos[j][2];
        const r2 = dx*dx + dy*dy + dz*dz;
        const r  = Math.sqrt(r2);
        const r3 = r2 * r;

        const nx = dx / r, ny = dy / r, nz = dz / r;

        const vi2 = vel[i][0]**2 + vel[i][1]**2 + vel[i][2]**2;
        const vj2 = vel[j][0]**2 + vel[j][1]**2 + vel[j][2]**2;
        const vi_vj = vel[i][0]*vel[j][0] + vel[i][1]*vel[j][1] + vel[i][2]*vel[j][2];
        const vj_n  = vel[j][0]*nx + vel[j][1]*ny + vel[j][2]*nz;
        const vi_n  = vel[i][0]*nx + vel[i][1]*ny + vel[i][2]*nz;

        const GMj = G * this.masses[j];
        const a0  = -GMj / r2;  // Newtonian

        // Sum gravitational potentials for PN corrections
        let Ui = 0, Uj = 0;
        for (let k = 0; k < this.N; k++) {
          if (k !== i) {
            const dxik = pos[i][0]-pos[k][0], dyik = pos[i][1]-pos[k][1], dzik = pos[i][2]-pos[k][2];
            Ui += G * this.masses[k] / Math.sqrt(dxik*dxik + dyik*dyik + dzik*dzik);
          }
          if (k !== j) {
            const dxjk = pos[j][0]-pos[k][0], dyjk = pos[j][1]-pos[k][1], dzjk = pos[j][2]-pos[k][2];
            Uj += G * this.masses[k] / Math.sqrt(dxjk*dxjk + dyjk*dyjk + dzjk*dzjk);
          }
        }

        // 1PN EIH radial scalar correction (Will 2014, eq. 6.52)
        const pn_radial = 1.0 + (1.0/c2) * (
          -4.0*Ui - Uj - vi2 - 2.0*vj2 + 4.0*vi_vj + 1.5*vj_n*vj_n
        );

        // 1PN transverse velocity correction
        const pn_vel_coef = (1.0/c2) * (4.0*vi_n - 3.0*vj_n);

        const dvx = vel[i][0] - vel[j][0];
        const dvy = vel[i][1] - vel[j][1];
        const dvz = vel[i][2] - vel[j][2];

        acc[i][0] += a0 * (nx * pn_radial + dvx * pn_vel_coef);
        acc[i][1] += a0 * (ny * pn_radial + dvy * pn_vel_coef);
        acc[i][2] += a0 * (nz * pn_radial + dvz * pn_vel_coef);
      }
    }
    return acc;
  }

  /** Build flat state vector [x0,y0,z0, vx0,vy0,vz0, x1,...] */
  _stateVector(pos, vel) {
    const s = [];
    for (let i = 0; i < this.N; i++) s.push(...pos[i], ...vel[i]);
    return s;
  }

  /** Unpack state vector back to pos/vel arrays */
  _unpackState(s) {
    const pos = [], vel = [];
    for (let i = 0; i < this.N; i++) {
      pos.push([s[6*i], s[6*i+1], s[6*i+2]]);
      vel.push([s[6*i+3], s[6*i+4], s[6*i+5]]);
    }
    return { pos, vel };
  }

  /** Compute time-derivative of state vector. */
  _derivative(s) {
    const { pos, vel } = this._unpackState(s);
    const acc = this._calculateAccelerations(pos, vel);
    const ds = [];
    for (let i = 0; i < this.N; i++) {
      ds.push(...vel[i], ...acc[i]);
    }
    return ds;
  }

  /** RK4 step — O(dt⁵) local truncation error. */
  step(dt) {
    const s0 = this._stateVector(this.positions, this.velocities);
    const k1 = this._derivative(s0);
    const s1 = s0.map((v, i) => v + 0.5 * dt * k1[i]);
    const k2 = this._derivative(s1);
    const s2 = s0.map((v, i) => v + 0.5 * dt * k2[i]);
    const k3 = this._derivative(s2);
    const s3 = s0.map((v, i) => v + dt * k3[i]);
    const k4 = this._derivative(s3);

    const sn = s0.map((v, i) =>
      v + (dt / 6.0) * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i])
    );

    const { pos, vel } = this._unpackState(sn);
    this.positions  = pos;
    this.velocities = vel;
    this.time      += dt;
  }

  /** Total Newtonian conserved energy (for monitoring drift). */
  totalEnergy() {
    let KE = 0, PE = 0;
    for (let i = 0; i < this.N; i++) {
      const v2 = this.velocities[i].reduce((s, v) => s + v*v, 0);
      KE += 0.5 * this.masses[i] * v2;
      for (let j = i+1; j < this.N; j++) {
        const dx = this.positions[i][0]-this.positions[j][0];
        const dy = this.positions[i][1]-this.positions[j][1];
        const dz = this.positions[i][2]-this.positions[j][2];
        PE -= CONSTANTS.G * this.masses[i] * this.masses[j] / Math.sqrt(dx*dx+dy*dy+dz*dz);
      }
    }
    return KE + PE;
  }
}
