import { Tensor4 } from './07_TensorOperations.js';

/**
 * Module 11: Plasma Physics — Relativistic Particle-in-Cell
 *
 * AUDIT FINDINGS:
 *   CRITICAL BUG — Explicit Euler update of 4-momentum under Lorentz force
 *   does NOT conserve the magnetic moment μ = p_perp²/(2mB). After even a few
 *   gyro-periods the particle energy diverges because the rotation is treated
 *   as if it were a straight kick.
 *
 * FIX: Relativistic Boris Pusher (Vay 2008; Ripperda et al. 2018).
 *   The Boris pusher splits each timestep into:
 *     1. Half electric kick:  u' = u + (qE/2m)Δτ
 *     2. Magnetic rotation:   u'' = rotate(u', B, Δτ)
 *     3. Half electric kick:  u''' = u'' + (qE/2m)Δτ
 *   The magnetic rotation is implicit → exactly conserves |u|² from B alone.
 *
 *   For curved spacetime (Bacchini et al. 2018), the gravitational geodesic
 *   term −Γ^μ_αβ p^α p^β is applied as a full explicit kick (gravity is
 *   conservative so energy error stays bounded).
 *
 * References:
 *   Boris (1970); Vay (2008) Phys. Plasmas 15:056701;
 *   Bacchini et al. (2018) ApJS 237:6
 */
export class RelativisticPIC {
  constructor(gridParams) {
    this.particles = [];
  }

  addParticle(x, p, q, m) {
    this.particles.push({ x: [...x], p: [...p], q, m });
  }

  /** Boris rotation of u by B over dt in flat-space terms (3-vector). */
  _borisRotate(u3, B3, qm_half_dt) {
    // t = (q/m)(B/2)dt / γ  — but we use the u formulation (Vay 2008 eq.5)
    const tx = qm_half_dt * B3[0];
    const ty = qm_half_dt * B3[1];
    const tz = qm_half_dt * B3[2];
    const t2 = tx*tx + ty*ty + tz*tz;
    const s  = 2.0 / (1.0 + t2);

    // u' = u + u × t
    const cpx = u3[1]*tz - u3[2]*ty;
    const cpy = u3[2]*tx - u3[0]*tz;
    const cpz = u3[0]*ty - u3[1]*tx;
    const up = [u3[0]+cpx, u3[1]+cpy, u3[2]+cpz];

    // u'' = u + up × s
    return [
      u3[0] + s*(up[1]*tz - up[2]*ty),
      u3[1] + s*(up[2]*tx - up[0]*tz),
      u3[2] + s*(up[0]*ty - up[1]*tx)
    ];
  }

  /**
   * Advance all particles by proper time dtau using Relativistic Boris pusher.
   *
   * @param {number}   dtau            Proper time step
   * @param {Function} F_tensor_func   x => Tensor4  (covariant F_μν)
   * @param {Function} inv_metric_func x => Tensor4  (contravariant g^μν)
   * @param {Function} Gamma_func      x => [4][4][4] Christoffel
   */
  step(dtau, F_tensor_func, inv_metric_func, Gamma_func) {
    for (const part of this.particles) {
      const { x, p, q, m } = part;
      const qm = q / m;

      const F     = F_tensor_func(x);
      const invG  = inv_metric_func(x);
      const Gamma = Gamma_func(x);

      // ── Gravity kick (full explicit): dp^μ/dτ|_grav = −Γ^μ_αβ p^α p^β ──
      const dp_grav = [0, 0, 0, 0];
      for (let mu = 0; mu < 4; mu++) {
        for (let alpha = 0; alpha < 4; alpha++) {
          for (let beta = 0; beta < 4; beta++) {
            dp_grav[mu] -= Gamma[mu][alpha][beta] * p[alpha] * p[beta];
          }
        }
      }

      // Apply gravity kick (full step)
      for (let mu = 0; mu < 4; mu++) p[mu] += dp_grav[mu] * dtau;

      // ── Extract coordinate 3-velocity from p ──
      const gamma_W = p[0] / m;  // Lorentz factor (approximate)
      const u3 = [p[1]/m, p[2]/m, p[3]/m];

      // ── Extract E and B from F_μν: E_i = F_{i0},  B_i from dual ──
      // F in local coordinates (t,x,y,z):
      // E_x = F_{10}, E_y = F_{20}, E_z = F_{30}
      // B_x = F_{32}, B_y = F_{13}, B_z = F_{21}
      const E3 = [F.get(1,0), F.get(2,0), F.get(3,0)];
      const B3 = [F.get(3,2), F.get(1,3), F.get(2,1)];

      const qm_half_dt = qm * dtau * 0.5;

      // ── Half electric kick ──
      const u3_minus = [
        u3[0] + qm_half_dt * E3[0],
        u3[1] + qm_half_dt * E3[1],
        u3[2] + qm_half_dt * E3[2]
      ];

      // ── Boris magnetic rotation ──
      const u3_plus = this._borisRotate(u3_minus, B3, qm_half_dt);

      // ── Half electric kick ──
      const u3_new = [
        u3_plus[0] + qm_half_dt * E3[0],
        u3_plus[1] + qm_half_dt * E3[1],
        u3_plus[2] + qm_half_dt * E3[2]
      ];

      // Update 4-momentum (mass-shell condition: p^0 = m sqrt(1 + |u|²))
      const u2new = u3_new[0]**2 + u3_new[1]**2 + u3_new[2]**2;
      part.p[0] = m * Math.sqrt(1.0 + u2new);
      part.p[1] = m * u3_new[0];
      part.p[2] = m * u3_new[1];
      part.p[3] = m * u3_new[2];

      // Advance position: dx^μ/dτ = p^μ/m
      for (let mu = 0; mu < 4; mu++) {
        part.x[mu] += (part.p[mu] / m) * dtau;
      }
    }
  }
}
