import { Tensor4 } from './07_TensorOperations.js';
import { getKerrMetric } from './03_KerrGeometry.js';
import { FaradayTensorBuilder } from './10_ElectromagneticFields.js';
import { covariantDivergenceFaraday } from './09_MaxwellEquations.js';
import { RelativisticPIC } from './11_PlasmaPhysics.js';
import { GRMHDSolver } from './12_Magnetohydrodynamics.js';

console.log("Testing Advanced GRMHD (Phase 6)...");

const M = 1.0;
const a = 0.0; // Schwarzschild for simplicity

// 1. Electromagnetic Fields and Maxwell Equations
console.log("Testing Faraday Tensor Builder...");
// Uniform B_z field
const F_uniform = FaradayTensorBuilder.fromEBFields(0, 0, 0, 0, 0, 1.0);
console.log(`F_xy (should be B_z): ${F_uniform.get(1, 2)}`);

// Define a simple potential A_μ = [0, -y*B/2, x*B/2, 0] for uniform B_z field
const B0 = 1.0;
const potentialFunc = (x) => {
  return [0, -x[2]*B0/2.0, x[1]*B0/2.0, 0];
};

const x_test = [0, 1, 1, 0];
const F_potential = FaradayTensorBuilder.fromPotential(potentialFunc, x_test);
console.log(`F_xy from Potential (should be B0): ${F_potential.get(1, 2)}`);

// Covariant Divergence (In uniform field, divergence should be 0, so J=0)
const Gamma_flat = (x) => {
  // Flat space Christoffel is 0
  const G = [];
  for(let i=0; i<4; i++) {
    G[i] = [];
    for(let j=0; j<4; j++) {
      G[i][j] = [0,0,0,0];
    }
  }
  return G;
};

const J_μ = covariantDivergenceFaraday((x) => FaradayTensorBuilder.fromPotential(potentialFunc, x), x_test, Gamma_flat);
console.log(`Current density J^μ from uniform B-field: [${J_μ.map(j => Math.abs(j) < 1e-10 ? 0 : j.toFixed(5)).join(', ')}]`);

// 2. Relativistic PIC
console.log("Testing Relativistic PIC Pusher...");
const pic = new RelativisticPIC({});
pic.addParticle([0, 1, 0, 0], [0, 0.5, 0, 0], 1.0, 1.0); // q=1, m=1, p_x = 0.5
// Flat metric
const flat_metric = () => {
  const m = new Tensor4();
  m.set(0,0, -1);
  m.set(1,1, 1);
  m.set(2,2, 1);
  m.set(3,3, 1);
  return m;
};

pic.step(0.1, () => F_uniform, flat_metric, Gamma_flat);
console.log(`Particle pushed. New p_μ: [${pic.particles[0].p.map(p => p.toFixed(5)).join(', ')}]`);

// 3. GRMHD
console.log("Testing GRMHD Conservative Conversion...");
const mhd = new GRMHDSolver(10, 10, 10);

// Primitives:
const rho = 1.0; // Density
const P = 0.1;   // Pressure
const v = [0.1, 0, 0]; // Velocity x
const B = [0, 0, 1.0]; // Magnetic field z

const metric = getKerrMetric(M, a, 5.0, Math.PI/2);
const inv_metric = metric.inverse();

const cons = mhd.primitivesToConservatives(rho, P, v, B, metric, inv_metric);
console.log(`Conservatives computed: D=${cons.D.toFixed(5)}, tau=${cons.tau.toFixed(5)}`);
console.log(`Momentum S_j: [${cons.S.map(s => s.toFixed(5)).join(', ')}]`);

console.log("Phase 6 testing complete.");
