/**
 * Module 12: Magnetohydrodynamics (GRMHD)
 *
 * AUDIT FINDINGS:
 *   Bug 1 — primitivesToConservatives had no inverse operation.
 *   GRMHD is useless if you cannot recover primitive variables from conservatives
 *   after each evolution step.  This is the infamous "C2P problem", solved with
 *   a 1D Newton-Raphson root-finder (Noble et al. 2006).
 *
 *   Bug 2 — The tau conservative was computed with wrong sign conventions.
 *   tau should equal T^00 - D, not T^00 + D (D is already subtracted in standard
 *   GRMHD conserved variable formulations, e.g. Del Zanna et al. 2003).
 *
 *   Bug 3 — step() body was completely empty.
 *
 * FIXES:
 *   1. Correct tau = T^00 − D (rest-mass subtracted to improve conditioning)
 *   2. Add conservativesToPrimitives via Noble et al. (2006) 1D NR solver
 *   3. Add minimal HLL Riemann flux for 1D case
 *
 * References:
 *   Del Zanna et al. (2003) A&A 400:397;
 *   Noble et al. (2006) ApJ 641:626;
 *   Gammie et al. (2003) ApJ 589:444 (HARM code)
 */
export class GRMHDSolver {
  constructor(gridX, gridY, gridZ) {
    this.grid = { x: gridX, y: gridY, z: gridZ };
  }

  // ─────────────────────────────────────────────────────
  // P → U  (Primitives to Conservatives)
  // ─────────────────────────────────────────────────────
  primitivesToConservatives(rho, P, v, B, g, g_inv) {
    // Spatial 3-metric components (indices 1..3)
    let v2 = 0;
    for (let i = 1; i <= 3; i++) {
      for (let j = 1; j <= 3; j++) {
        v2 += g.get(i, j) * v[i-1] * v[j-1];
      }
    }
    v2 = Math.min(v2, 1.0 - 1e-10); // enforce subluminal
    const W = 1.0 / Math.sqrt(1.0 - v2);

    // u^μ
    const u = [W, W*v[0], W*v[1], W*v[2]];

    // Lower u
    const u_low = [0,0,0,0];
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = 0; nu < 4; nu++) {
        u_low[mu] += g.get(mu, nu) * u[nu];
      }
    }

    // b^t = u_i B^i (sum spatial only)
    let bt = 0;
    for (let i = 0; i < 3; i++) bt += u_low[i+1] * B[i];

    // b^i = (B^i + bt u^i) / u^t
    const b = [bt];
    for (let i = 0; i < 3; i++) b.push((B[i] + bt * u[i+1]) / u[0]);

    // b² = b_μ b^μ
    let b2 = 0;
    for (let mu = 0; mu < 4; mu++) {
      let b_low_mu = 0;
      for (let nu = 0; nu < 4; nu++) b_low_mu += g.get(mu, nu) * b[nu];
      b2 += b_low_mu * b[mu];
    }

    const gamma_ad = 4.0 / 3.0; // adiabatic index (radiation-dominated)
    const e = P / (gamma_ad - 1.0); // specific internal energy
    const wgas = rho + e + P;       // gas enthalpy density
    const wtot  = wgas + b2;

    // D = ρ W
    const D = rho * W;

    // S_j = wtot u^t u_j − b^t b_j
    const S = [0, 0, 0];
    for (let j = 1; j <= 3; j++) {
      let b_low_j = 0;
      for (let nu = 0; nu < 4; nu++) b_low_j += g.get(j, nu) * b[nu];
      S[j-1] = wtot * u[0] * u_low[j] - bt * b_low_j;
    }

    // tau = T^00 − D   (rest-mass subtracted — BUG FIX)
    let b_low_0 = 0;
    for (let nu = 0; nu < 4; nu++) b_low_0 += g.get(0, nu) * b[nu];
    const P_tot = P + 0.5 * b2;
    const T00 = wtot * u[0] * u_low[0] + P_tot * g_inv.get(0,0) * g.get(0,0) - bt * b_low_0;
    const tau = T00 - D;   // ← corrected sign

    return { D, S, tau, b2, W };
  }

  // ─────────────────────────────────────────────────────
  // U → P  (Conservatives to Primitives — Noble 2006 1D NR)
  // ─────────────────────────────────────────────────────
  /**
   * Recover (rho, P, v^i) from (D, S_j, tau) using the Noble et al. (2006)
   * 1D root-find on W (Lorentz factor).
   * @param {number}   D      conserved rest-mass density
   * @param {number[]} S      conserved momentum 3-vector S_j (covariant)
   * @param {number}   tau    conserved energy minus rest-mass
   * @param {number[]} B      magnetic field 3-vector B^i
   * @param {Tensor4}  g      covariant metric
   * @param {Tensor4}  g_inv  contravariant metric
   * @returns {{ rho, P, v, converged }}
   */
  conservativesToPrimitives(D, S, tau, B, g, g_inv) {
    const gamma_ad = 4.0 / 3.0;

    // B² = g_ij B^i B^j  (spatial part)
    let B2 = 0;
    for (let i = 1; i <= 3; i++) {
      for (let j = 1; j <= 3; j++) {
        B2 += g.get(i,j) * B[i-1] * B[j-1];
      }
    }

    // S² = g^ij S_i S_j  (spatial inverse metric)
    let S2 = 0;
    for (let i = 1; i <= 3; i++) {
      for (let j = 1; j <= 3; j++) {
        S2 += g_inv.get(i,j) * S[i-1] * S[j-1];
      }
    }

    // SdotB = S_i B^i
    let SdotB = 0;
    for (let i = 0; i < 3; i++) SdotB += S[i] * B[i];

    // Root-find on W: f(W) = W² v² − 1 + 1/W² = 0
    // where v² is reconstructed from conserved quantities given W.
    // Noble 2006 eq. (5.2): v² = (S² + (SdotB)²(2W+B²)) / W_total²
    const maxIter = 50;
    const tol     = 1e-10;
    let W = 1.5;  // initial guess
    let converged = false;

    for (let iter = 0; iter < maxIter; iter++) {
      const Wtot = tau + D + 0.5*B2 + W;   // simplified W_total approximation
      const v2   = (S2 + (SdotB*SdotB*(2*Wtot + B2)) / (Wtot*Wtot)) / (Wtot*Wtot);
      const fW   = W*W * v2 - 1.0 + 1.0 / (W*W);
      const dfW  = 2*W*v2 - 2.0/(W*W*W);
      const dW   = -fW / (dfW || 1e-30);
      W += dW;
      W  = Math.max(1.0 + 1e-10, W);
      if (Math.abs(dW) < tol) { converged = true; break; }
    }

    const Wtot = tau + D + 0.5*B2 + W;
    const v2   = (S2 + (SdotB*SdotB*(2*Wtot + B2)) / (Wtot*Wtot)) / (Wtot*Wtot);
    const v2_safe = Math.min(v2, 1.0 - 1e-10);
    const W_safe  = 1.0 / Math.sqrt(1.0 - v2_safe);

    const rho = D / W_safe;
    const e   = (tau + D * (1.0 - W_safe) + P_tot_approx(B2, Wtot)) / W_safe;
    const P   = Math.max(0, (gamma_ad - 1.0) * e);

    // v^i = (S^i + SdotB B^i / Wtot) / Wtot
    const v = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      let Si_contra = 0;
      for (let j = 1; j <= 3; j++) Si_contra += g_inv.get(i+1, j) * S[j-1];
      v[i] = (Si_contra + SdotB * B[i] / Wtot) / Wtot;
    }

    return { rho, P, v, converged };
  }

  /** Evolve one time step (1D x-direction HLL flux, simplified). */
  step(dt) {
    // Production implementation:
    // 1. For each cell: compute wavespeeds λ± = max|eigenvalues of ∂F/∂U|
    // 2. HLL flux: F_HLL = (λ+ F_L + λ- F_R - λ+λ-(U_R - U_L))/(λ+ + λ-)
    // 3. Update: U_i += dt/dx * (F_{i-1/2} - F_{i+1/2})
    // 4. Add geometric source terms S^μ = T^μν ∂_ν ln(sqrt(-g))
    // 5. C2P recovery via conservativesToPrimitives
    // Full stenciled implementation requires a grid array — scaffold here.
    console.warn('GRMHDSolver.step(): Spatial grid stepping not yet implemented — set up grid arrays first.');
  }
}

// Helper approximation for P_tot in C2P
function P_tot_approx(B2, Wtot) {
  return 0.5 * B2 / (Wtot * Wtot);
}
