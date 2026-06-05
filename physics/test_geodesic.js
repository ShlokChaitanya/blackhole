import { getKerrMetric } from './03_KerrGeometry.js';
import { GeodesicIntegrator } from './06_GeodesicIntegration.js';
import { calculateISCO } from './22_OrbitalDynamics.js';

const M = 1.0;
const a = 0.5;

console.log("Testing Geometries and Geodesic Integrator...");

const isco = calculateISCO(M, a);
console.log(`Calculated ISCO (M=${M}, a=${a}): Prograde=${isco.prograde.toFixed(5)}, Retrograde=${isco.retrograde.toFixed(5)}`);

// Setup Integrator for Kerr Metric
const integrator = new GeodesicIntegrator((x) => {
  // x = [t, r, θ, φ]
  return getKerrMetric(M, a, x[1], x[2]);
});

// Initial conditions for a circular orbit at prograde ISCO
const r0 = isco.prograde;
const theta0 = Math.PI / 2;

// To find the exact momentum p_μ for a circular orbit, we use the fact that
// dθ/dλ = 0, dr/dλ = 0.
// For a photon or particle, calculating p_t and p_φ analytically is usually done 
// via the constants of motion. 
// For this simple test, we will just evaluate the metric at ISCO
const metric_isco = getKerrMetric(M, a, r0, theta0);
console.log("Kerr Metric at ISCO:");
console.log(`g_tt: ${metric_isco.get(0,0).toFixed(5)}`);
console.log(`g_tφ: ${metric_isco.get(0,3).toFixed(5)}`);
console.log(`g_rr: ${metric_isco.get(1,1).toFixed(5)}`);
console.log(`g_φφ: ${metric_isco.get(3,3).toFixed(5)}`);

// Verify Inverse works
const inv = metric_isco.inverse();
console.log("Inverse Kerr Metric at ISCO:");
console.log(`g^tt: ${inv.get(0,0).toFixed(5)}`);
console.log(`g^tφ: ${inv.get(0,3).toFixed(5)}`);
console.log(`g^rr: ${inv.get(1,1).toFixed(5)}`);
console.log(`g^φφ: ${inv.get(3,3).toFixed(5)}`);

// Basic identity check g * g^-1 = I
const I = metric_isco.multiply(inv);
console.log("Identity check (g * g^-1):");
console.log(`I[0,0]: ${I.get(0,0).toFixed(5)}, I[1,1]: ${I.get(1,1).toFixed(5)}, I[2,2]: ${I.get(2,2).toFixed(5)}, I[3,3]: ${I.get(3,3).toFixed(5)}`);
console.log(`I[0,1]: ${Math.abs(I.get(0,1)).toFixed(5)}, I[0,3]: ${Math.abs(I.get(0,3)).toFixed(5)}`);

// Let's do a single step of the geodesic integrator with a dummy momentum
const x = [0, r0, theta0, 0];
// Photon momentum p_t = -1, p_φ = b (impact parameter)
// Just arbitrary values to test if the RK4 step executes without NaN
const p = [-1, 0, 0, 3.5]; 

console.log("Taking one RK4 Hamiltonian step...");
const next = integrator.step(x, p, 0.1);

console.log(`Next x: [${next.x.map(v => v.toFixed(5)).join(', ')}]`);
console.log(`Next p: [${next.p.map(v => v.toFixed(5)).join(', ')}]`);
console.log("Geodesic Integrator step successful.");
