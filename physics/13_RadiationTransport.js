/**
 * Module 13: Radiation Transport (GRRT)
 *
 * AUDIT FINDINGS:
 *   Previously a stub with no implementation.
 *
 * Theory:
 *   General Relativistic Radiative Transfer integrates the specific intensity
 *   I_ν along null geodesics accounting for emission, absorption, and scattering.
 *
 *   The invariant quantity is I_ν / ν³. Along a ray:
 *   d(I_ν/ν³)/dλ = j_ν/ν³ - α_ν I_ν/ν³
 *
 *   where:
 *     j_ν = emission coefficient (erg/cm³/s/Hz/sr)
 *     α_ν = absorption coefficient (cm⁻¹)
 *     λ   = affine parameter along the null geodesic
 *
 * For thermal synchrotron emission from the disk:
 *   j_ν ∝ n_e B sin(θ_B) (ν/ν_c)^{1/3} exp(-ν/ν_c)  [Mahadevan 1996]
 *   ν_c = 3/2 γ² (eB/2πm_e c)  (critical synchrotron frequency)
 *
 * Implementation:
 *   Integrate along pre-computed geodesic path using forward Euler on
 *   (I_ν/ν³). The Doppler shift g = ν_obs/ν_em is applied as:
 *   I_ν_obs = g³ I_ν_em
 *
 * References:
 *   Dolence et al. (2009) ApJS 184:387 (grmonty);
 *   Dexter & Agol (2009) ApJ 696:1616 (geokerr);
 *   EHT Collaboration et al. (2019) ApJL 875:L1
 */

/** Physical constants in CGS (for synchrotron calculations). */
const CGS = {
  e:    4.803e-10,   // statcoulombs
  m_e:  9.109e-28,   // g
  c:    2.998e10,    // cm/s
  k_B:  1.380e-16,   // erg/K
};

/**
 * Critical synchrotron frequency ν_c for a relativistic electron.
 * ν_c = (3/2) γ² (eB)/(2π m_e c)  [Hz]
 * @param {number} gamma_e  Lorentz factor of electron
 * @param {number} B_gauss  magnetic field strength (Gauss)
 */
export function criticalSynchrotronFrequency(gamma_e, B_gauss) {
  return 1.5 * gamma_e * gamma_e * (CGS.e * B_gauss) / (2 * Math.PI * CGS.m_e * CGS.c);
}

/**
 * Thermal synchrotron emissivity j_ν (erg/cm³/s/Hz/sr).
 * Fit from Mahadevan, Narayan & Yi (1996) ApJ 465:327, eq. (21).
 * @param {number} n_e      electron number density (cm⁻³)
 * @param {number} B_gauss  magnetic field (Gauss)
 * @param {number} T_e_K    electron temperature (K)
 * @param {number} nu       frequency (Hz)
 */
export function thermalSynchrotronEmissivity(n_e, B_gauss, T_e_K, nu) {
  const m_e_c2 = CGS.m_e * CGS.c * CGS.c;
  const Theta   = CGS.k_B * T_e_K / m_e_c2; // dimensionless temperature
  if (Theta <= 0) return 0;

  const nu_B    = CGS.e * B_gauss / (2 * Math.PI * CGS.m_e * CGS.c);  // cyclotron freq
  const x_M     = nu / (nu_B * Theta * Theta);  // dimensionless frequency
  if (x_M <= 0) return 0;

  // Mahadevan (1996) fit function f(x_M)
  const f_xM = Math.pow(x_M, 1.0/3.0) * Math.exp(-Math.pow(x_M, 1.0/3.0)) *
               (1.0 + 2.0 * Math.pow(x_M, -1.0/3.0));  // simplified fitting formula

  const prefactor = (Math.sqrt(3.0) * CGS.e * CGS.e * nu_B * n_e) / CGS.c;
  return prefactor * f_xM;
}

/**
 * GR Radiative Transfer along a null geodesic.
 * Integrates d(I/ν³)/dλ = j/ν³ − α I/ν³ along each step.
 *
 * @param {Array}    geodesic_path  Array of {x, nu_local} objects along the ray
 * @param {Function} emissivityFunc  (x) => j_ν (erg/cm³/s/Hz/sr)
 * @param {Function} absorptionFunc  (x) => α_ν (cm⁻¹), or null for optically thin
 * @returns {{ intensity: number, tau_total: number }}
 */
export function integrateRadiativeTransfer(geodesic_path, emissivityFunc, absorptionFunc = null) {
  let I_invariant = 0;  // I_ν / ν³ (Lorentz invariant)
  let tau_total   = 0;

  for (let i = 0; i < geodesic_path.length - 1; i++) {
    const step  = geodesic_path[i];
    const dlamb = step.dlambda || 0.1;  // affine parameter step

    const j_nu  = emissivityFunc(step.x);
    const alpha = absorptionFunc ? absorptionFunc(step.x) : 0;
    const nu    = step.nu_local;

    if (nu <= 0) continue;

    const j_inv   = j_nu / (nu * nu * nu);
    const source  = j_inv - alpha * I_invariant;

    I_invariant  += source * dlamb;
    tau_total    += alpha * dlamb;
    I_invariant   = Math.max(0, I_invariant);  // physical floor
  }

  return { intensity: I_invariant, tau_total };
}

/**
 * Apply observed Doppler boosting to recovered intensity.
 * I_ν_obs = g³ I_ν_em  (from invariance of I/ν³)
 * @param {number} I_invariant  I_ν_em / ν_em³ (invariant)
 * @param {number} g            Doppler factor ν_obs / ν_em
 * @param {number} nu_obs       observed frequency (Hz)
 */
export function applyDopplerBoost(I_invariant, g, nu_obs) {
  return I_invariant * Math.pow(g, 3) * (nu_obs * nu_obs * nu_obs);
}
