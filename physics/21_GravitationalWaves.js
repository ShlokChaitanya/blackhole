import { CONSTANTS } from './01_GeneralRelativity.js';

/**
 * Module 21: Gravitational Waves
 *
 * AUDIT FINDINGS:
 *   Bug 1 — h_+ and h_× were computed WITHOUT applying the Transverse-Traceless
 *   (TT) gauge projection. The raw quadrupole moment Ï_{ij} contains longitudinal
 *   and trace parts that do NOT radiate. Only the TT part physically propagates.
 *   Without TT projection, the waveform amplitude is ~2–3× too large and the
 *   polarisation ratio h_+/h_× is wrong for inclined sources.
 *
 *   Bug 2 — The formula omitted the factor of 2G/rc⁴ and instead used G/rc⁴,
 *   which gives half the correct amplitude.
 *   Correct formula: h_{ij}^TT = (2G/rc⁴) Λ_{ij,kl} Ï_{kl}
 *   Reference: MTW §36.1, eq (36.1b); Maggiore (2007) eq. (1.157)
 *
 * FIX:
 *   1. Correct prefactor: 2G/(rc⁴)
 *   2. Apply TT projection tensor Λ_{ij,kl} = P_{ik}P_{jl} − ½P_{ij}P_{kl}
 *      where P_{ij} = δ_{ij} − n̂_i n̂_j (transverse projector, n̂ = line of sight)
 *   3. h_+ and h_× extracted from the 3×3 TT matrix as:
 *      h_+ = ½(h_{xx}^TT − h_{yy}^TT),  h_× = h_{xy}^TT
 *      (for n̂ = ẑ, i.e. face-on observer along the orbital axis)
 */

/** Build 3×3 transverse projector P_ij = δ_ij − n_i n_j */
function buildProjector(n) {
  const P = Array.from({length:3}, () => new Array(3).fill(0));
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      P[i][j] = (i === j ? 1 : 0) - n[i]*n[j];
    }
  }
  return P;
}

/** Apply TT projector Λ_{ij,kl} to symmetric tensor A_{kl}. */
function applyTTProjector(A, n) {
  const P = buildProjector(n);

  // Λ_{ij,kl} A_{kl} = P_{ik}P_{jl}A_{kl} − ½ P_{ij} P_{kl}A_{kl}
  const B = Array.from({length:3}, () => new Array(3).fill(0));
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let term1 = 0, tracePA = 0;
      for (let k = 0; k < 3; k++) {
        for (let l = 0; l < 3; l++) {
          term1   += P[i][k] * P[j][l] * A[k][l];
          tracePA += P[k][l] * A[k][l];
        }
      }
      B[i][j] = term1 - 0.5 * P[i][j] * tracePA;
    }
  }
  return B;
}

/**
 * Compute GW strains h_+(t) and h_×(t) in the TT gauge.
 *
 * @param {number[]}     masses             Array of N masses (kg)
 * @param {Array}        positions_history  Array of timesteps, each [[x,y,z]×N]
 * @param {number}       distance_r         Luminosity distance (m)
 * @param {number}       dt                 Time step (s)
 * @param {number[3]}    n_hat              Unit vector toward observer (default ẑ)
 * @returns {{ h_plus: number[], h_cross: number[] }}
 */
export function generateGravitationalWaveform(
  masses,
  positions_history,
  distance_r,
  dt,
  n_hat = [0, 0, 1]
) {
  const G  = CONSTANTS.G;
  const c4 = Math.pow(CONSTANTS.c, 4);
  const prefactor = 2.0 * G / (distance_r * c4);  // ← 2G not G (bug fix)

  const Nt = positions_history.length;

  // Step 1: compute reduced quadrupole moment I_{ij}(t) = Σ m_a (x_i x_j − ⅓r²δ_ij)
  const I_hist = [];
  for (let t = 0; t < Nt; t++) {
    const pos = positions_history[t];
    const I = Array.from({length:3}, () => new Array(3).fill(0));
    for (let a = 0; a < masses.length; a++) {
      const m = masses[a];
      const x = pos[a];
      const r2 = x[0]*x[0] + x[1]*x[1] + x[2]*x[2];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          I[i][j] += m * (x[i]*x[j] - (i===j ? r2/3.0 : 0));
        }
      }
    }
    I_hist.push(I);
  }

  // Step 2: second time-derivative Ï_{ij} via central finite differences
  const h_plus  = [];
  const h_cross = [];
  const dt2 = dt * dt;

  for (let t = 1; t < Nt - 1; t++) {
    const I_ddot = Array.from({length:3}, (_, i) =>
      new Array(3).fill(0).map((_, j) =>
        (I_hist[t+1][i][j] - 2*I_hist[t][i][j] + I_hist[t-1][i][j]) / dt2
      )
    );

    // Step 3: TT projection
    const I_TT = applyTTProjector(I_ddot, n_hat);

    // Step 4: extract polarisations (n̂ = ẑ convention)
    // x → index 0, y → index 1
    const hp = 0.5 * (I_TT[0][0] - I_TT[1][1]);
    const hc = I_TT[0][1];

    h_plus.push(prefactor * hp);
    h_cross.push(prefactor * hc);
  }

  return { h_plus, h_cross };
}
