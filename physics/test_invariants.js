import { getKerrMetric } from './03_KerrGeometry.js';
import { computeThinDiskTemperature, computeDisk4Velocity } from './14_AccretionDiskPhysics.js';
import { calculateDopplerFactor } from './16_RelativisticDoppler.js';
import { calculateGravitationalRedshift } from './17_GravitationalRedshift.js';
import { calculateTimeDilationFactor } from './18_TimeDilation.js';

const M = 1.0;
const a = 0.5;
const r = 6.0;
const theta = Math.PI / 2;

console.log("Testing Astrophysical Models (Phase 3)...");

// 1. Accretion Disk Physics
// Let's use 10 Solar Masses and 1e-8 M_sun/yr accretion rate
const M_sun = 1.98847e30;
const M_kg = 10 * M_sun;
const M_dot = 1e-8 * M_sun / (365 * 24 * 3600); // kg / s
const T = computeThinDiskTemperature(M_kg, a, M_dot, r);
console.log(`Novikov-Thorne Temperature at r=${r}M: ${T.toExponential(4)} K`);

const u_fluid = computeDisk4Velocity(M, a, r);
console.log(`Fluid 4-velocity at r=${r}M: [${u_fluid.map(x=>x.toFixed(5)).join(', ')}]`);

// 2. Metric and Time Dilation
const g_em = getKerrMetric(M, a, r, theta);
// Convert 4-velocity to 3-velocity v^i = u^i / u^t
const v3 = [ u_fluid[1]/u_fluid[0], u_fluid[2]/u_fluid[0], u_fluid[3]/u_fluid[0] ];
const dtau_dt = calculateTimeDilationFactor(g_em, v3);
console.log(`Time dilation factor dtau/dt for orbiting fluid: ${dtau_dt.toFixed(5)}`);

// 3. Gravitational Redshift
const z_grav = calculateGravitationalRedshift(g_em.get(0,0));
console.log(`Gravitational Redshift z (static emitter at r=${r}M to infinity): ${z_grav.toFixed(5)}`);

// 4. Relativistic Doppler Factor
// Observer at infinity, static
const u_obs = [1.0, 0, 0, 0];
// Flat spacetime metric at infinity
const g_obs = getKerrMetric(M, 0, 1e6, theta); 

// Let's create a photon emitted radially outwards for simplicity
// Normalization g_mu_nu p^mu p^nu = 0
// p^t = 1/sqrt(-g_tt), p^r = 1/sqrt(g_rr)
const p_t = Math.sqrt(-1.0 / g_em.get(0,0));
const p_r = Math.sqrt(1.0 / g_em.get(1,1));
const p_em = [p_t, p_r, 0, 0];

// The photon reaches infinity. Momentum components change along geodesic,
// but for an equatorial radial photon, energy E = -p_t (covariant) is conserved.
// For simplicity of this unit test, let's just pretend p_obs = [1, 1, 0, 0] 
// to see if the inner product math executes correctly.
const p_obs = [1.0, 1.0, 0, 0];

const doppler = calculateDopplerFactor(p_em, u_fluid, p_obs, u_obs, g_em, g_obs);
console.log(`Relativistic Doppler factor g (fluid to infinity): ${doppler.toFixed(5)}`);

console.log("Phase 3 testing complete.");
