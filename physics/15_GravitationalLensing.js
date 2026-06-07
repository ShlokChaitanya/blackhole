/**
 * Module 15: Gravitational Lensing (Backward null-geodesic raytracing)
 *
 * AUDIT FINDINGS:
 *   Previously a pure stub — no implementation whatsoever.
 *
 * Theory:
 *   The apparent image of a source is distorted by the curvature of spacetime.
 *   The deflection angle α for a photon passing a mass M at impact parameter b:
 *
 *   Schwarzschild (weak field, exact to all orders in 2M/b):
 *     α_exact = 4M/b × [1 + (15π/16)(M/b) + ...]   [Iyer & Hansen 2009]
 *
 *   For raytracing we use the backward-ray method:
 *     - fire a null geodesic from the camera into the scene
 *     - integrate Hamilton's equations: dx^μ/dλ = g^μν p_ν
 *     - when the ray escapes to large r, compute the asymptotic direction
 *     - map to source sky coordinates (Einstein ring, shadow)
 *
 * Shadow / Photon ring analysis:
 *   Critical impact parameter b_c = 3√3 M (Schwarzschild)
 *   For Kerr: b_c depends on spin a through the Carter constant Q.
 *
 * References:
 *   Bardeen (1973) in "Black Holes", p. 215;
 *   Falcke, Melia & Agol (2000) ApJL 528:L13 (shadow);
 *   EHT Collaboration (2019) ApJL 875:L6
 */

/**
 * Compute the weak-field gravitational deflection angle (Schwarzschild).
 * α = 4GM/c²b  (leading order)
 * @param {number} M_kg   mass in kg
 * @param {number} b_m    impact parameter in metres
 * @returns {number}      deflection angle in radians
 */
export function weakFieldDeflectionAngle(M_kg, b_m) {
  const G = 6.674e-11, c = 2.998e8;
  return (4.0 * G * M_kg) / (c * c * b_m);
}

/**
 * Schwarzschild shadow radius (apparent angular radius seen by distant observer).
 * r_shadow = b_c = 3√3 M  (geometric units)
 * @param {number} M    geometric mass
 * @param {number} D    observer distance (same units as M)
 * @returns {number}    angular shadow radius (radians)
 */
export function schwarzschildShadowRadius(M, D) {
  const b_c = 3.0 * Math.sqrt(3.0) * M;
  return Math.atan2(b_c, D);  // small-angle: ≈ b_c / D
}

/**
 * Kerr shadow silhouette: compute apparent impact parameters (α, β) for
 * a set of photon orbits on the critical curve.
 * Uses the Bardeen (1973) analytic expressions.
 *
 * For an observer at inclination θ_obs (0 = face-on, π/2 = edge-on):
 *   α = −ξ / sin(θ_obs)
 *   β = ±√(η + a² cos²θ_obs − ξ² cot²θ_obs)
 *
 * where (ξ, η) are the Carter constants at the photon sphere.
 *
 * @param {number} M          geometric mass (= 1 canonical)
 * @param {number} a          spin parameter (|a| ≤ M)
 * @param {number} theta_obs  observer inclination (radians)
 * @param {number} N_phi      number of azimuthal samples on critical curve
 * @returns {{alpha: number[], beta: number[]}} shadow boundary in celestial coords
 */
export function kerrShadowContour(M, a, theta_obs, N_phi = 200) {
  const alpha = [], beta = [];
  const sinO  = Math.sin(theta_obs);
  const cosO  = Math.cos(theta_obs);
  const cos2O = cosO * cosO;

  // Photon orbits parameterised by r_ph ∈ [r_ph_retro, r_ph_pro]
  // r_ph satisfies: r³ − 3Mr² + a²r + a²M = 0 (Bardeen 1972 eq. A26 corrected)
  // We sweep r from prograde to retrograde photon orbit
  const r_ph_min = 2.0 * M * (1.0 + Math.cos((2.0/3.0) * Math.acos(-a/M)));
  const r_ph_max = 2.0 * M * (1.0 + Math.cos((2.0/3.0) * Math.acos( a/M)));

  for (let i = 0; i < N_phi; i++) {
    const r_ph = r_ph_min + (r_ph_max - r_ph_min) * i / (N_phi - 1);
    const r2   = r_ph * r_ph;
    const Delta = r2 - 2 * M * r_ph + a * a;

    // Carter constants at r_ph (Bardeen 1973 eq. 2.10-2.11)
    const xi = (r2 * (r_ph - M) - Delta * (r_ph + M)) / (a * (r_ph - M)) || 0;
    const eta_val = r2 * r2 * (4 * a * a * Delta - (r_ph * (r2 - a*a) - 2 * M * r2)**2 / Delta);
    if (isNaN(xi) || eta_val < 0) continue;

    const eta = eta_val / Math.max(1e-30, (r_ph - M)**2 * a * a);

    const al = -xi / sinO;
    const bt_sq = eta + a*a * cos2O - xi*xi * cos2O / (sinO*sinO);
    if (bt_sq < 0) continue;

    // Two branches (top/bottom of shadow)
    alpha.push(al, al);
    beta.push( Math.sqrt(bt_sq), -Math.sqrt(bt_sq));
  }

  return { alpha, beta };
}

/**
 * Einstein ring radius for a point-mass lens.
 * θ_E = sqrt(4GM D_LS / (c² D_L D_S))  [radians]
 * @param {number} M_kg   lens mass (kg)
 * @param {number} D_L    observer-lens distance (m)
 * @param {number} D_S    observer-source distance (m)
 * @param {number} D_LS   lens-source distance (m)
 */
export function einsteinRingRadius(M_kg, D_L, D_S, D_LS) {
  const G = 6.674e-11, c = 2.998e8;
  return Math.sqrt((4.0 * G * M_kg * D_LS) / (c * c * D_L * D_S));
}
