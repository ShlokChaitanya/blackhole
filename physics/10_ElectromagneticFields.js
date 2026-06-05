import { Tensor4 } from './07_TensorOperations.js';

/**
 * Module 10: Electromagnetic Fields
 * 
 * Theory:
 * The Faraday tensor encapsulates both the electric and magnetic fields.
 * 
 * Equations:
 * F_μν = ∂_μ A_ν - ∂_ν A_μ
 * E_i = F_{i0}
 * B^i = -1/2 ε^{ijk} F_{jk}
 */

export class FaradayTensorBuilder {
  static fromEBFields(E_x, E_y, E_z, B_x, B_y, B_z) {
    const data = [
      0,    -E_x, -E_y, -E_z,
      E_x,   0,    B_z, -B_y,
      E_y,  -B_z,  0,    B_x,
      E_z,   B_y, -B_x,  0
    ];
    return new Tensor4(data);
  }

  static fromPotential(potentialFunc, x, dx = 1e-5) {
    const F = new Tensor4();
    
    const dA = [];
    for (let mu = 0; mu < 4; mu++) {
      const x_plus = [...x];
      const x_minus = [...x];
      x_plus[mu] += dx;
      x_minus[mu] -= dx;
      
      const A_plus = potentialFunc(x_plus);
      const A_minus = potentialFunc(x_minus);
      
      const deriv = [];
      for (let nu = 0; nu < 4; nu++) {
        deriv.push((A_plus[nu] - A_minus[nu]) / (2 * dx));
      }
      dA.push(deriv);
    }
    
    for (let mu = 0; mu < 4; mu++) {
      for (let nu = 0; nu < 4; nu++) {
        const val = dA[mu][nu] - dA[nu][mu];
        F.set(mu, nu, val);
      }
    }
    
    return F;
  }
}
