/**
 * Module 1: General Relativity (Core)
 * 
 * Theory:
 * General Relativity describes gravity not as a force, but as a consequence of the 
 * curvature of spacetime caused by the uneven distribution of mass and energy. 
 * Spacetime is modeled as a 4-dimensional pseudo-Riemannian manifold with a 
 * metric signature (- + + +).
 * 
 * Equations:
 * - Line element: ds^2 = g_μν dx^μ dx^ν
 * - SI to Geometric Unit Conversions:
 *   L_g = G * M / c^2  (Length)
 *   T_g = G * M / c^3  (Time)
 *   M_g = M            (Mass)
 * 
 * Implementation Strategy:
 * Define fundamental physical constants in SI units. Provide conversion utilities 
 * to switch between SI units and Natural/Geometric units (where G = c = 1) to 
 * prevent numerical overflow/underflow during tensor calculations.
 * 
 * Dependencies: None
 * Performance Costs: O(1), trivial arithmetic.
 * Numerical Methods: High-precision floating point constants.
 */

export const CONSTANTS = {
  // SI Units
  G: 6.67430e-11,       // Gravitational constant (m^3 kg^-1 s^-2)
  c: 299792458,         // Speed of light (m/s)
  k_B: 1.380649e-23,    // Boltzmann constant (J/K)
  hbar: 1.054571817e-34,// Reduced Planck constant (J s)
  M_sun: 1.98847e30,    // Solar mass (kg)
  pc: 3.085677581e16,   // Parsec (m)
};

export class UnitConverter {
  constructor(mass_SI) {
    this.mass_SI = mass_SI; // e.g. M_sun
    
    // Scale factors
    this.L_scale = (CONSTANTS.G * this.mass_SI) / (CONSTANTS.c * CONSTANTS.c);
    this.T_scale = this.L_scale / CONSTANTS.c;
  }

  // SI to Geometric
  lengthToGeo(meters) { return meters / this.L_scale; }
  timeToGeo(seconds) { return seconds / this.T_scale; }
  massToGeo(kg) { return kg / this.mass_SI; }

  // Geometric to SI
  lengthToSI(geoL) { return geoL * this.L_scale; }
  timeToSI(geoT) { return geoT * this.T_scale; }
  massToSI(geoM) { return geoM * this.mass_SI; }
}
