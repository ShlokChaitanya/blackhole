/**
 * Module 15: Gravitational Lensing
 * 
 * Theory:
 * Lensing is the result of light following null geodesics (ds^2 = 0) in curved spacetime.
 * An observer's camera receives rays that have been severely deflected.
 * 
 * Implementation Strategy:
 * Map 2D camera pixels to initial 3D positions and 4-momenta. 
 * Use the Geodesic Integrator (Module 6) to trace these rays backward in time 
 * away from the observer until they hit the event horizon, the disk, or the celestial sphere.
 * 
 * Dependencies: Module 6 (Geodesics)
 * Performance Costs: O(W * H * steps). Generally executed on GPU via shaders.
 * Numerical Methods: Backward ray-tracing.
 */

export class LensingCamera {
  constructor(fov, width, height, observerPos) {
    // Setup camera plane and initial momentum vectors p^μ
  }
  
  generateInitialRay(x, y) {
    // Given pixel (x,y), return initial [t, r, θ, φ] and [p_t, p_r, p_θ, p_φ]
    // properly normalized such that g_μν p^μ p^ν = 0 (null)
    return { pos: [0,0,0,0], p: [0,0,0,0] };
  }
}
