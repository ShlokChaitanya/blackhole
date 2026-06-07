/**
 * Scientific Audit Verification Suite
 * Tests all rectified modules against known analytical results.
 */
import { getSchwarzschildMetric, getSchwarzschildHorizons } from './02_SchwarzschildGeometry.js';
import { getKerrMetric, getKerrHorizons } from './03_KerrGeometry.js';
import { getKerrNewmanMetric, getKerrNewmanHorizons } from './04_KerrNewmanGeometry.js';
import { computeKretschmannScalarSchwarzschild, computeKretschmannScalarKerr } from './08_CurvatureCalculations.js';
import { computeNTFlux, computeDisk4Velocity } from './14_AccretionDiskPhysics.js';
import { generateGravitationalWaveform } from './21_GravitationalWaves.js';
import { EIHIntegrator } from './23_NBodyPhysics.js';
import { schwarzschildShadowRadius, weakFieldDeflectionAngle } from './15_GravitationalLensing.js';

let passed = 0, failed = 0;
function check(label, value, expected, tol = 1e-3) {
  // Use absolute tolerance when expected is near zero to avoid division-by-zero inflation
  const err = Math.abs(expected) < 1e-20
    ? Math.abs(value)
    : Math.abs(value - expected) / Math.abs(expected);
  if (err < tol) {
    console.log(`  ✓  ${label}: ${value.toExponential(5)}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}: got ${value.toExponential(5)}, expected ~${expected.toExponential(5)} (err=${(err*100).toFixed(2)}%)`);
    failed++;
  }
}

console.log('\n═══════════════════════════════════════════════════');
console.log('  PHYSICS ENGINE — SCIENTIFIC AUDIT VERIFICATION   ');
console.log('═══════════════════════════════════════════════════\n');

// ── MODULE 02: Schwarzschild Kerr-Schild ───────────────────────────────────
console.log('[ 02 ] Schwarzschild Kerr-Schild metric');
const M = 1.0;
const g_sch_far = getSchwarzschildMetric(M, 100, Math.PI/2);
// At large r: g_tt → −1, g_rr → 1, g_tr → 0 (asymptotically flat)
check('g_tt at r=100M → −1', g_sch_far.get(0,0), -1.0, 0.05);
check('g_rr at r=100M → 1',  g_sch_far.get(1,1),  1.0, 0.05);

// At r = 2M (horizon) — KS should be FINITE, not throw
try {
  const g_hor = getSchwarzschildMetric(M, 2*M, Math.PI/2);
  const g_rr_hor = g_hor.get(1,1);
  if (isFinite(g_rr_hor)) {
    console.log(`  ✓  Horizon penetrating: g_rr(r=2M) = ${g_rr_hor.toFixed(4)} (finite)`);
    passed++;
  } else {
    console.error(`  ✗  g_rr at horizon is not finite: ${g_rr_hor}`);
    failed++;
  }
} catch(e) {
  console.error(`  ✗  Threw at horizon: ${e.message}`);
  failed++;
}

const sch_hor = getSchwarzschildHorizons(M);
check('Schwarzschild horizon r=2M', sch_hor.outer, 2*M, 1e-10);

// ── MODULE 03: Kerr Kerr-Schild ────────────────────────────────────────────
console.log('\n[ 03 ] Kerr Kerr-Schild metric');
const a = 0.5;
const ker_hor = getKerrHorizons(M, a);
const r_plus_expected = M + Math.sqrt(M*M - a*a);
check('Kerr outer horizon r+', ker_hor.outer, r_plus_expected, 1e-10);

// At r=r+: metric should be finite
const g_kerr_hor = getKerrMetric(M, a, ker_hor.outer, Math.PI/2);
if (isFinite(g_kerr_hor.get(0,0)) && isFinite(g_kerr_hor.get(1,1))) {
  console.log('  ✓  Kerr metric finite at outer horizon');
  passed++;
} else {
  console.error('  ✗  Kerr metric NOT finite at outer horizon');
  failed++;
}

// g^μν g_μν = δ^μ_ν (identity test)
const g_kerr = getKerrMetric(M, a, 5.0, Math.PI/2);
const g_inv  = g_kerr.inverse();
const Identity = g_kerr.multiply(g_inv);
check('Identity g·g⁻¹ diagonal [0,0]', Identity.get(0,0), 1.0, 1e-8);
check('Identity g·g⁻¹ diagonal [1,1]', Identity.get(1,1), 1.0, 1e-8);
check('Identity g·g⁻¹ off-diag [0,1]', Math.abs(Identity.get(0,1)), 0.0, 1e-8);

// ── MODULE 04: Kerr-Newman ─────────────────────────────────────────────────
console.log('\n[ 04 ] Kerr-Newman metric');
const Q = 0.3;
const kn_hor = getKerrNewmanHorizons(M, a, Q);
const kn_rp  = M + Math.sqrt(M*M - a*a - Q*Q);
check('KN outer horizon', kn_hor.outer, kn_rp, 1e-10);
const g_kn_hor = getKerrNewmanMetric(M, a, Q, kn_hor.outer, Math.PI/2);
if (isFinite(g_kn_hor.get(0,0))) {
  console.log('  ✓  KN metric finite at outer horizon');
  passed++;
} else {
  console.error('  ✗  KN metric NOT finite');
  failed++;
}

// ── MODULE 08: Curvature ───────────────────────────────────────────────────
console.log('\n[ 08 ] Kretschmann Scalars');
// Schwarzschild K = 48M²/r⁶
check('K_Schwarzschild at r=5M', computeKretschmannScalarSchwarzschild(M, 5), 48/(5**6), 1e-10);
// Kerr K → 48M²/r⁶ as a→0 (equatorial)
const K_kerr  = computeKretschmannScalarKerr(M, 0.001, 5, Math.PI/2);
const K_schw  = computeKretschmannScalarSchwarzschild(M, 5);
check('K_Kerr(a≈0) ≈ K_Schwarzschild', K_kerr, K_schw, 0.01);

// ── MODULE 14: Novikov-Thorne flux ─────────────────────────────────────────
console.log('\n[ 14 ] Novikov-Thorne / Page-Thorne flux');
const r_isco = 6.0; // Schwarzschild ISCO = 6M
const flux = computeNTFlux(1.0, 0.5, 8.0, r_isco, 1e-2, 100);
if (flux > 0 && isFinite(flux)) {
  console.log(`  ✓  NT flux at r=8M: ${flux.toExponential(4)} (positive & finite)`);
  passed++;
} else {
  console.error(`  ✗  NT flux non-positive or NaN: ${flux}`);
  failed++;
}
// Flux must vanish at ISCO
const flux_isco = computeNTFlux(1.0, 0.001, r_isco, r_isco, 1e-4, 100);
check('NT flux = 0 at ISCO', flux_isco, 0, 1e-10);

// ── MODULE 15: Lensing ─────────────────────────────────────────────────────
console.log('\n[ 15 ] Gravitational Lensing');
// Solar deflection: M=M_sun, b=R_sun → 1.75 arcsec = 8.48e-6 rad
const M_sun = 1.989e30, G = 6.674e-11, c = 2.998e8;
const R_sun = 6.957e8;
const alpha_sol = weakFieldDeflectionAngle(M_sun, R_sun);
check('Solar deflection angle (rad)', alpha_sol, 8.48e-6, 0.02);

// Shadow radius: b_c = 3√3 M (geometric), seen from distance D=1000M
const r_shadow_rad = schwarzschildShadowRadius(1.0, 1000.0);
const expected_rad = 3*Math.sqrt(3) / 1000.0;
check('Schwarzschild shadow angle', r_shadow_rad, expected_rad, 1e-3);

// ── MODULE 21: Gravitational Waves (TT gauge) ──────────────────────────────
console.log('\n[ 21 ] Gravitational Waves — TT gauge');
// Simple circular binary: equal masses m, separation R, face-on observer
// Analytical h_+ = 4G²m²/(c⁴ R D) × ... for circular orbit ~ 1e-20 at 1 Mpc
const M_sun_kg = 1.989e30;
const m1 = 30*M_sun_kg, m2 = 30*M_sun_kg;
const Rsep  = 1000e3;       // 1000 km
const Nmock = 3;            // minimal 3-point history for 1 waveform sample
const mock_hist = [];
// Static pair at ±R/2 for derivative test
for (let t = -1; t <= 1; t++) {
  const v_circ = Math.sqrt(G*(m1+m2)/Rsep)/2;
  const phi = t * 0.001;
  mock_hist.push([
    [Rsep/2*Math.cos(phi), Rsep/2*Math.sin(phi), 0],
    [-Rsep/2*Math.cos(phi), -Rsep/2*Math.sin(phi), 0]
  ]);
}
const Mpc = 3.086e22;
const waves = generateGravitationalWaveform([m1, m2], mock_hist, Mpc, 0.001);
if (waves.h_plus.length === 1) {
  console.log(`  ✓  TT waveform produced 1 sample: h+ = ${waves.h_plus[0].toExponential(4)}`);
  passed++;
} else {
  console.error(`  ✗  Unexpected waveform length: ${waves.h_plus.length}`);
  failed++;
}

// ── MODULE 23: EIH RK4 energy conservation ────────────────────────────────
console.log('\n[ 23 ] EIH RK4 — energy conservation');
const m_body = 30 * M_sun_kg;
const r0 = 1e9;  // 1 million km — weak-field regime for 1PN validity
const v_circ = Math.sqrt(G * 2*m_body / r0) / 2;
const eih = new EIHIntegrator(
  [m_body, m_body],
  [[r0/2,0,0], [-r0/2,0,0]],
  [[0,v_circ,0], [0,-v_circ,0]]
);
const E0 = eih.totalEnergy();
for (let i = 0; i < 100; i++) eih.step(0.1);
const E1 = eih.totalEnergy();
const dE_rel = Math.abs(E1 - E0) / Math.abs(E0);
if (dE_rel < 0.01) {
  console.log(`  ✓  RK4 energy drift after 100 steps: ${(dE_rel*100).toFixed(4)}%`);
  passed++;
} else {
  console.error(`  ✗  RK4 energy drift too large: ${(dE_rel*100).toFixed(2)}%`);
  failed++;
}

// ── FINAL SUMMARY ─────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════');
const score = Math.round((passed / (passed+failed)) * 100);
console.log(`  Tests passed: ${passed}/${passed+failed}`);
console.log(`  Scientific accuracy score: ${score}/100`);
console.log('═══════════════════════════════════════════════════\n');
