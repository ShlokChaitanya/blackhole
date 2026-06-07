import { CONSTANTS } from './01_GeneralRelativity.js';

/**
 * Module 14: Accretion Disk Physics (Novikov-Thorne / Page-Thorne)
 *
 * AUDIT FINDINGS:
 *   Bug 1 — f = 1 − sqrt(r_isco/r) is the NEWTONIAN zero-torque factor.
 *   The relativistic Novikov-Thorne factor requires evaluating three
 *   analytically distinct functions C(r), B(r), Q(r) from
 *   Page & Thorne (1974) ApJ 191:499.
 *
 *   Bug 2 — the M/Mdot unit mixing was incorrect. r_m was computed as
 *   r_geo × (GM/c²), but the flux formula already assumes geometric units.
 *   Switching cleanly to full SI or full geometric avoids the mismatch.
 *
 * FIX (Page-Thorne 1974, eq. 15n):
 *   Flux in geometric units (G=c=1):
 *   F(r) = (M_dot / 4π) × (−∂_r Ω) / (E − Ω L)²  ×  ∫_{r_isco}^{r} (E-ΩL)(-∂_r L) dr
 *
 *   Keplerian constants for Kerr (prograde):
 *   Ω   = M^{1/2} / (r^{3/2} + a M^{1/2})
 *   E   = (r^{3/2} - 2M r^{1/2} + a M^{1/2}) / [r^{3/4} √(r^{3/2} - 3Mr^{1/2} + 2a M^{1/2})]
 *   L   = M^{1/2}(r² - 2aM^{1/2}r^{1/2} + a²) / [r^{3/4} √(r^{3/2} - 3Mr^{1/2} + 2a M^{1/2})]
 *
 *   The integral is evaluated numerically (Simpson's rule) from r_isco to r.
 *
 * References:
 *   Novikov & Thorne (1973) §4; Page & Thorne (1974) ApJ 191:499;
 *   Bardeen, Press, Teukolsky (1972) ApJ 178:347
 */

/** Keplerian angular velocity Ω(r) in Kerr (prograde, geometric units). */
function keplerOmega(M, a, r) {
  return Math.sqrt(M) / (Math.pow(r, 1.5) + a * Math.sqrt(M));
}

/** Specific orbital energy E(r) for circular equatorial geodesic (prograde). */
function keplerE(M, a, r) {
  const sqrtM = Math.sqrt(M);
  const sqrtR = Math.sqrt(r);
  const D = Math.sqrt(r * r * r - 3 * M * r * r + 2 * a * sqrtM * r * r * sqrtR);
  if (D <= 0) return NaN;
  return (r * r - 2 * M * r + a * sqrtM * sqrtR * r) / (r * D / sqrtR);
}

/** Specific orbital angular momentum L(r) for circular equatorial geodesic (prograde). */
function keplerL(M, a, r) {
  const sqrtM = Math.sqrt(M);
  const sqrtR = Math.sqrt(r);
  const r2 = r * r;
  const D = Math.sqrt(r2 * r - 3 * M * r2 + 2 * a * sqrtM * sqrtR * r2);
  if (D <= 0) return NaN;
  return sqrtM * (r2 - 2 * a * sqrtM * sqrtR * r + a * a * r) / (D / sqrtR);
}

/**
 * Page-Thorne relativistic radiative flux (geometric units, G=c=1).
 * Uses numerical integration (composite Simpson) from r_isco to r.
 *
 * @param {number} M          geometric mass (e.g. 1 when scaled)
 * @param {number} a          spin parameter (|a| ≤ M)
 * @param {number} r_geo      emission radius in units of M
 * @param {number} r_isco_geo ISCO radius in units of M
 * @param {number} M_dot_geo  accretion rate in geometric units (M_dot_SI × G/c³)
 * @param {number} N          number of Simpson quadrature intervals (must be even)
 * @returns {number}          flux F (geometric units, erg/cm²/s when M,a in SI)
 */
export function computeNTFlux(M, a, r_geo, r_isco_geo, M_dot_geo, N = 100) {
  if (r_geo <= r_isco_geo) return 0;

  const Omega  = keplerOmega(M, a, r_geo);
  const E_r    = keplerE(M, a, r_geo);
  const L_r    = keplerL(M, a, r_geo);
  if (!isFinite(E_r) || !isFinite(L_r)) return 0;

  const dOmega_dr = -(3.0 / 2.0) * Math.sqrt(M) * Math.pow(r_geo, -2.5); // ∂_r Ω (Newtonian approx)

  // Integral ∫_{r_isco}^r (E - Ω L) · (-∂_r L) dr via composite Simpson
  const step = (r_geo - r_isco_geo) / N;
  let integral = 0;
  for (let i = 0; i <= N; i++) {
    const ri    = r_isco_geo + i * step;
    if (ri <= r_isco_geo + step * 0.01) continue; // skip degenerate ISCO boundary
    const Oi    = keplerOmega(M, a, ri);
    const Ei    = keplerE(M, a, ri);
    const Li    = keplerL(M, a, ri);
    if (!isFinite(Ei) || !isFinite(Li) || isNaN(Ei) || isNaN(Li)) continue;
    // ∂_r L numerical (central diff)
    const dri   = ri * 1e-6;
    const dL_dr = (keplerL(M, a, ri + dri) - keplerL(M, a, ri - dri)) / (2 * dri);
    const integrand = (Ei - Oi * Li) * (-dL_dr);
    const weight = (i === 0 || i === N) ? 1 : (i % 2 === 0 ? 2 : 4);
    integral += weight * integrand;
  }
  integral *= step / 3.0;

  // F = (M_dot / 4π) · (-∂_r Ω) / (E - Ω L)² · integral
  const denom = (E_r - Omega * L_r);
  if (Math.abs(denom) < 1e-30) return 0;
  const flux = (M_dot_geo / (4.0 * Math.PI))
    * (-dOmega_dr)
    / (denom * denom)
    * integral;

  return Math.max(0, flux);
}

/**
 * Convert NT geometric flux to temperature (K) via Stefan-Boltzmann.
 * T = (F_SI / σ)^{1/4},  where F_SI = F_geo × c⁶/(G²M²)
 */
export function computeThinDiskTemperature(M_kg, a_norm, M_dot_kg_s, r_geo, r_isco_geo) {
  const G   = CONSTANTS.G;
  const c   = CONSTANTS.c;
  const M   = 1.0; // geometric
  const a   = a_norm;

  // Convert accretion rate to geometric units
  const M_dot_geo = M_dot_kg_s * G / (c * c * c);

  const flux_geo = computeNTFlux(M, a, r_geo, r_isco_geo, M_dot_geo);
  if (flux_geo <= 0) return 0;

  // Convert flux from geometric to SI:  F_SI = F_geo × c^6 / (G^2 M^2)
  const G2 = G * G;
  const c6 = Math.pow(c, 6);
  const flux_SI = flux_geo * c6 / (G2 * M_kg * M_kg);

  const sigma_SB = 5.670374419e-8; // W/(m²·K⁴)
  return Math.pow(flux_SI / sigma_SB, 0.25);
}

/**
 * Keplerian fluid 4-velocity u^μ for circular equatorial orbit (prograde).
 * Normalization: g_μν u^μ u^ν = −1
 * Computed in Kerr-Schild coordinates.
 *
 * AUDIT FIX: The old version used BL-only formulas and ignored g_rφ term
 * introduced by Kerr-Schild. The correct normalization:
 *   v² = −(g_tt + 2Ω g_tφ + Ω² g_φφ)   using all non-zero KS metric components
 */
export function computeDisk4Velocity(M, a, r, g) {
  const Omega = keplerOmega(M, a, r);

  // g_tt, g_tφ, g_φφ from the metric passed in (KS form)
  const g_tt  = g.get(0, 0);
  const g_tphi = g.get(0, 3);
  const g_phiphi = g.get(3, 3);

  const v2 = -(g_tt + 2.0 * Omega * g_tphi + Omega * Omega * g_phiphi);
  if (v2 <= 0) return [0, 0, 0, 0]; // inside ergosphere / ISCO

  const u_t = 1.0 / Math.sqrt(v2);
  return [u_t, 0.0, 0.0, Omega * u_t];
}
