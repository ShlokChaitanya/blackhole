/**
 * Module 18: Time Dilation
 * 
 * Theory:
 * Proper time τ ticking on a clock moving through spacetime differs from 
 * coordinate time t.
 * 
 * Equations:
 * dτ = sqrt(-g_μν dx^μ dx^ν)
 * dτ/dt = sqrt(-g_00 - 2g_0i v^i - g_ij v^i v^j)
 * 
 * Implementation Strategy:
 * Given a particle's 3-velocity v^i = dx^i/dt, calculate dτ/dt.
 * 
 * Dependencies: Module 2/3 (Metrics)
 * Performance Costs: O(1)
 */

export function calculateTimeDilationFactor(metric, velocity3D) {
  // metric is Tensor4, velocity3D is [v^r, v^theta, v^phi] = dx^i/dt
  // (dt/dt = 1)
  const v = [1.0, velocity3D[0], velocity3D[1], velocity3D[2]];
  
  // ds^2 = g_μν v^μ v^ν dt^2
  // dτ/dt = sqrt(-g_μν v^μ v^ν)
  
  let ds2_over_dt2 = 0;
  for (let mu = 0; mu < 4; mu++) {
    for (let nu = 0; nu < 4; nu++) {
      ds2_over_dt2 += metric.get(mu, nu) * v[mu] * v[nu];
    }
  }
  
  if (ds2_over_dt2 > 0) {
    // Particle is moving faster than light or inside ergosphere without dragging
    return 0;
  }
  
  return Math.sqrt(-ds2_over_dt2); 
}
