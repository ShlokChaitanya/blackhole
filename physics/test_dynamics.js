import { CONSTANTS } from './01_GeneralRelativity.js';
import { EIHIntegrator } from './23_NBodyPhysics.js';
import { generateGravitationalWaveform } from './21_GravitationalWaves.js';

console.log("Testing Dynamics and N-Body (Phase 5)...");

// Simulating a Binary Black Hole Merger (Equal Mass)
// Let's use 30 Solar Masses each
const M_sun = 1.98847e30;
const m1 = 30 * M_sun;
const m2 = 30 * M_sun;
const masses = [m1, m2];

// Initial separation: 1000 km
const R = 1000e3;
const pos1 = [R/2, 0, 0];
const pos2 = [-R/2, 0, 0];
const positions = [pos1, pos2];

// Keplerian velocity for circular orbit: v = sqrt(G M_total / 4R) for each body
const v = Math.sqrt(CONSTANTS.G * (m1 + m2) / R) / 2.0; // rough approximation for IC
const vel1 = [0, v, 0];
const vel2 = [0, -v, 0];
const velocities = [vel1, vel2];

const integrator = new EIHIntegrator(masses, positions, velocities);

// We will simulate for 1 second with dt = 0.001s (1000 steps)
const dt = 0.001;
const steps = 1000;

const pos_history = [];

console.log("Integrating EIH equations for 1000 steps...");
for (let i = 0; i < steps; i++) {
  // Store a deep copy of positions for waveform generation
  pos_history.push([
    [integrator.positions[0][0], integrator.positions[0][1], integrator.positions[0][2]],
    [integrator.positions[1][0], integrator.positions[1][1], integrator.positions[1][2]]
  ]);
  
  integrator.step(dt);
}

// Calculate Gravitational Waves emitted at distance of 1 Mpc
const Mpc = 3.086e22; // meters
const distance = 1 * Mpc;

console.log("Calculating Quadrupolar Gravitational Wave Strain...");
const waves = generateGravitationalWaveform(masses, pos_history, distance, dt);

console.log(`Peak h_plus strain: ${Math.max(...waves.h_plus.map(Math.abs)).toExponential(4)}`);
console.log(`Peak h_cross strain: ${Math.max(...waves.h_cross.map(Math.abs)).toExponential(4)}`);
console.log(`Number of waveform samples: ${waves.h_plus.length}`);

console.log("Phase 5 testing complete.");
