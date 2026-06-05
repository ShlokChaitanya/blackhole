/**
 * Module 11: Plasma Physics
 * 
 * Theory:
 * Behavior of collisionless relativistic plasmas around black holes.
 * 
 * Equations:
 * Vlasov equation: p^μ ∂_μ f - Γ^i_μν p^μ p^ν (∂f / ∂p^i) = 0
 * 
 * Implementation Strategy:
 * Particle-in-Cell (PIC) representation. Evolve macro-particles in the 
 * background EM field (F_μν) and metric (g_μν), gathering charge/current densities.
 * 
 * Dependencies: Module 6 (Geodesics, but with Lorentz force added)
 * Performance Costs: Extreme. N-particles * grid interpolation.
 * Numerical Methods: Boris pusher adapted for curved spacetime.
 */

export class RelativisticPIC {
  constructor(gridParams) {
    this.particles = [];
  }
  
  addParticle(x, p, q, m) {
    this.particles.push({ x, p, q, m });
  }

  // F_tensor_func(x) -> covariant F_μν
  // inv_metric_func(x) -> contravariant g^μν
  // Gamma_func(x) -> Γ^α_βγ
  step(dtau, F_tensor_func, inv_metric_func, Gamma_func) {
    for (let i = 0; i < this.particles.length; i++) {
      const part = this.particles[i];
      const x = part.x;
      const p = part.p;
      
      const F = F_tensor_func(x);
      const inv_g = inv_metric_func(x);
      const Gamma = Gamma_func(x);
      
      const dp = [0, 0, 0, 0];
      const dx = [...p]; // dx^μ/dτ = p^μ for m=1 normalisation, actually p^μ/m
      
      // Calculate F^μ_ν = g^μα F_αν
      const F_mixed = [];
      for (let mu = 0; mu < 4; mu++) {
        F_mixed[mu] = [0, 0, 0, 0];
        for (let nu = 0; nu < 4; nu++) {
          for (let alpha = 0; alpha < 4; alpha++) {
            F_mixed[mu][nu] += inv_g.get(mu, alpha) * F.get(alpha, nu);
          }
        }
      }
      
      for (let mu = 0; mu < 4; mu++) {
        // Geodesic gravity term: -Γ^μ_αβ p^α p^β
        let gravity = 0;
        for (let alpha = 0; alpha < 4; alpha++) {
          for (let beta = 0; beta < 4; beta++) {
            gravity -= Gamma[alpha][beta][mu] * p[alpha] * p[beta]; // Note: Array indices may vary, assumed [alpha][beta][mu]
          }
        }
        
        // Lorentz force term: (q/m) F^μ_ν p^ν
        let lorentz = 0;
        for (let nu = 0; nu < 4; nu++) {
          lorentz += (part.q / part.m) * F_mixed[mu][nu] * p[nu];
        }
        
        dp[mu] = gravity + lorentz;
      }
      
      // Update particle
      for (let mu = 0; mu < 4; mu++) {
        part.p[mu] += dp[mu] * dtau;
        part.x[mu] += (part.p[mu] / part.m) * dtau;
      }
    }
  }
}
