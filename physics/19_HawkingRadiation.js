/**
 * Module 19: Hawking Radiation
 * 
 * Theory:
 * Quantum effects near the event horizon lead to particle creation and emission 
 * of thermal radiation.
 * 
 * Equations:
 * T_H = (hbar * c^3) / (8π * G * M * k_B)
 * Surface gravity κ = c^4 / (4GM) (for Schwarzschild)
 * T_H = (hbar * κ) / (2π * c * k_B) (generalized)
 * 
 * Implementation Strategy:
 * Compute surface gravity κ from the metric parameters, then calculate T_H.
 * 
 * Dependencies: Module 1 (Constants)
 * Performance Costs: O(1)
 */

import { CONSTANTS } from './01_GeneralRelativity.js';

export function calculateHawkingTemperature(M_kg) {
  // For Schwarzschild:
  const numerator = CONSTANTS.hbar * Math.pow(CONSTANTS.c, 3);
  const denominator = 8 * Math.PI * CONSTANTS.G * M_kg * CONSTANTS.k_B;
  return numerator / denominator;
}
