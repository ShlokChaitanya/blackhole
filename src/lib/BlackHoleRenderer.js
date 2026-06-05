import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// True volumetric raymarching shader for Interstellar-style Black Hole
const CinematicBlackHoleShader = {
  uniforms: {
    tDiffuse: { value: null },
    uCameraPos: { value: new THREE.Vector3() },
    uCameraMatrix: { value: new THREE.Matrix4() },
    uProjectionMatrixInverse: { value: new THREE.Matrix4() },
    uProjectionMatrix: { value: new THREE.Matrix4() },
    uViewMatrix: { value: new THREE.Matrix4() },
    uTime: { value: 0 },
    uMass: { value: 1.0 },
    uSpin: { value: 1.0 },
    uAccretionRate: { value: 1.0 },
    uResolution: { value: new THREE.Vector2() },
    uShowDisk: { value: 1.0 },
    uShowPhotonRing: { value: 1.0 },
    uShowLensing: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec3 uCameraPos;
    uniform mat4 uCameraMatrix;
    uniform mat4 uProjectionMatrixInverse;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uViewMatrix;
    uniform float uTime;
    uniform float uMass;
    uniform float uSpin;
    uniform float uAccretionRate;
    uniform vec2 uResolution;
    uniform float uShowDisk;
    uniform float uShowPhotonRing;
    uniform float uShowLensing;

    varying vec2 vUv;

    // Noise functions
    float hash(float n) { return fract(sin(n)*43758.5453); }
    float noise(vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f*f*(3.0-2.0*f);
      float n = p.x + p.y*57.0 + p.z*113.0;
      return mix(
        mix(mix(hash(n+0.0), hash(n+1.0),f.x), mix(hash(n+57.0), hash(n+58.0),f.x),f.y),
        mix(mix(hash(n+113.0), hash(n+114.0),f.x), mix(hash(n+170.0), hash(n+171.0),f.x),f.y),
        f.z);
    }
    float fbm(vec3 p) {
      float f = 0.0;
      f += 0.5000*noise(p); p = p*2.02;
      f += 0.2500*noise(p); p = p*2.03;
      f += 0.1250*noise(p); p = p*2.01;
      f += 0.0625*noise(p);
      return f;
    }

    // Novikov-Thorne Thin Disk Temperature Profile
    float diskTemperature(float r, float isco, float outerEdge) {
      if(r < isco || r > outerEdge) return 0.0;
      // Normalization factor based on mass and accretion rate
      // F(r) ~ (1 - sqrt(isco/r)) / r^3
      float f = 1.0 - sqrt(isco / r);
      float flux = f / pow(r, 3.0);
      return pow(max(0.0, flux), 0.25) * uAccretionRate; // Returns normalized T
    }

    // Disk density function
    float diskDensity(vec3 p, float isco, float outerEdge) {
      float r = length(p.xz);
      if(r < isco || r > outerEdge) return 0.0;
      
      // vertical falloff (geometrically thin disk)
      float h = abs(p.y);
      float maxH = 0.05 + (r - isco) * 0.02; // Thin disk
      if (h > maxH) return 0.0;
      
      float vDensity = 1.0 - (h / maxH);
      float rDensity = smoothstep(isco, isco + 0.5, r) * smoothstep(outerEdge, outerEdge - 5.0, r);
      
      // Fine fluid turbulence instead of chunky FBM
      float theta = atan(p.z, p.x);
      // Keplerian angular velocity in Kerr: Omega = 1 / (r^(3/2) + a)
      float omega = 1.0 / (pow(r, 1.5) + uSpin * uMass);
      float angle = theta - uTime * omega * 2.0;
      
      float n = fbm(vec3(r * 2.0, angle * 5.0, uTime * 0.5));
      float lanes = smoothstep(0.4, 0.6, n);
      
      return vDensity * rDensity * (0.5 + 0.5 * lanes);
    }

    void main() {
      // 1. Setup camera ray
      vec2 clipPos = vUv * 2.0 - 1.0;
      vec4 target = uProjectionMatrixInverse * vec4(clipPos.x, clipPos.y, 1.0, 1.0);
      vec3 rayDir = (uCameraMatrix * vec4(normalize(target.xyz / target.w), 0.0)).xyz;
      vec3 rayPos = uCameraPos;

      float Rs = 2.0 * uMass;
      float isco = 6.0 * uMass * (1.0 - uSpin * 0.5);
      float outerEdge = 30.0 * uMass;

      // 2. Geodesic integration (Raymarching)
      vec3 color = vec3(0.0);
      float transmittance = 1.0;
      
      float dt = 0.2;
      bool hitEH = false;
      float minR = 10000.0;

      // We march the ray forward. If lensing is on, we curve it.
      for(int i = 0; i < 300; i++) {
        float r2 = dot(rayPos, rayPos);
        float r = sqrt(r2);
        
        minR = min(minR, r);
        
        if(r < Rs) {
          hitEH = true;
          break;
        }
        
        // Adaptive step size based on distance to black hole.
        dt = max(0.01, (r - Rs) * 0.1);

        // Gravity bending using precise null geodesic equations
        if (uShowLensing > 0.5) {
          // Exact Schwarzschild null geodesic acceleration in Cartesian:
          // a = -1.5 * Rs * |L|^2 / r^5 * pos
          vec3 L = cross(rayPos, rayDir);
          float L2 = dot(L, L);
          vec3 a_grav = -1.5 * Rs * L2 / (r2 * r2 * r) * rayPos;
          
          // Lense-Thirring frame dragging (Spin approximation)
          // J = spin * M^2. Dipole-like magnetic field effect on ray.
          if (uSpin > 0.01) {
             vec3 J = vec3(0.0, uSpin * uMass * uMass, 0.0);
             vec3 a_LT = 2.0 * cross(J, rayDir) / (r2 * r) - 3.0 * dot(J, rayPos) * cross(rayPos, rayDir) / (r2 * r2 * r);
             a_grav += a_LT * 5.0; // Boosted slightly for visual effect
          }

          // Symplectic Euler integration
          rayDir += a_grav * dt;
          rayDir = normalize(rayDir);
        }

        // Sample Accretion Disk using GRRT (Module 13, 14, 16)
        if (uShowDisk > 0.5 && abs(rayPos.y) < 1.0 && r < outerEdge && r > isco) {
          float density = diskDensity(rayPos, isco, outerEdge);
          if (density > 0.0) {
            float T = diskTemperature(r, isco, outerEdge);
            
            // Relativistic Doppler Shift (Module 16)
            // Fluid 4-velocity u^mu Keplerian in Kerr
            float theta = atan(rayPos.z, rayPos.x);
            float omega = 1.0 / (pow(r, 1.5) + uSpin * uMass);
            vec3 vel = vec3(-sin(theta), 0.0, cos(theta)) * omega * r;
            
            // Lorentz factor
            float gamma = 1.0 / sqrt(max(0.001, 1.0 - dot(vel, vel)));
            
            // Doppler factor g = 1 / (gamma * (1 - dot(v, n)))
            float doppler = 1.0 / (gamma * (1.0 - dot(vel, -rayDir)));
            
            // Beaming factor is g^3 for intensity (I_nu / nu^3 invariant)
            float beaming = pow(doppler, 3.0);
            
            // Map temperature to color (Planck-like)
            vec3 hotColor = vec3(1.0, 0.9, 1.0); // X-ray/UV
            vec3 midColor = vec3(1.0, 0.4, 0.1); // Visible
            vec3 coldColor = vec3(0.2, 0.0, 0.0); // Infrared
            
            float t_norm = min(1.0, T * 2.0); // Normalize T
            vec3 emit = mix(coldColor, midColor, smoothstep(0.0, 0.5, t_norm));
            emit = mix(emit, hotColor, smoothstep(0.5, 1.0, t_norm));
            
            // Gravitational Redshift (Module 17)
            float z_grav = sqrt(1.0 - Rs/r); 
            emit *= z_grav; // Dimming due to climbing out of potential well
            
            emit *= beaming * density * 5.0 * dt;
            
            color += emit * transmittance;
            transmittance *= exp(-density * 10.0 * dt);
          }
        }
        
        if (transmittance < 0.01) break;
        if (r > 100.0) break; // Ray escaped

        rayPos += rayDir * dt;
      }

      // 3. Background composition & Photon Ring
      if (!hitEH && transmittance > 0.01) {
        
        // Add Explicit Photon Ring Glow
        // Rays that get very close to 1.5 * Rs without falling in form the photon sphere
        if (uShowPhotonRing > 0.5) {
          float prDist = abs(minR - 1.5 * Rs);
          float prGlow = exp(-prDist * 4.0); // Spread of the ring. Lower multiplier = wider ring
          color += vec3(1.0, 0.9, 0.6) * prGlow * 1.2 * transmittance;
        }

        // Find UV of the escaped ray to sample the background scene
        vec4 bgProj = uProjectionMatrix * uViewMatrix * vec4(rayPos + rayDir * 100.0, 1.0);
        vec2 bgUv = (bgProj.xy / bgProj.w) * 0.5 + 0.5;
        
        // Clamp to avoid sampling outside if deflected heavily, but actually wrap or fade
        if(bgUv.x >= 0.0 && bgUv.x <= 1.0 && bgUv.y >= 0.0 && bgUv.y <= 1.0) {
           vec3 bgCol = texture2D(tDiffuse, bgUv).rgb;
           color += bgCol * transmittance;
        }
      }
      
      // Tone mapping to prevent blown out whites
      color = 1.0 - exp(-color * 1.2);

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export class BlackHoleRenderer {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    this.setupComposer();
  }

  setupComposer() {
    this.composer = new EffectComposer(this.renderer);
    
    // Pass 1: Render R3F Scene (Starfield, Grids, etc)
    this.scenePass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.scenePass);
    
    // Pass 2: Raymarched Black Hole (Lenses the scene pass)
    this.bhPass = new ShaderPass(CinematicBlackHoleShader);
    this.composer.addPass(this.bhPass);
    
    // Pass 3: Cinematic Bloom
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.bloomPass = new UnrealBloomPass(resolution, 0.6, 0.5, 0.95);
    this.composer.addPass(this.bloomPass);
  }

  resize(width, height) {
    this.composer.setSize(width, height);
    this.bhPass.uniforms.uResolution.value.set(width, height);
  }

  update(params, dt) {
    const { mass, spin, accretionRate, showDisk, showPhotonRing, showLensing } = params;
    
    // Update Shader Uniforms
    const u = this.bhPass.uniforms;
    u.uTime.value += dt;
    u.uMass.value = mass;
    u.uSpin.value = spin;
    u.uAccretionRate.value = accretionRate;
    u.uShowDisk.value = showDisk ? 1.0 : 0.0;
    u.uShowPhotonRing.value = showPhotonRing ? 1.0 : 0.0;
    u.uShowLensing.value = showLensing ? 1.0 : 0.0;
    
    // Camera Matrices for ray direction calculation
    u.uCameraPos.value.copy(this.camera.position);
    u.uCameraMatrix.value.copy(this.camera.matrixWorld);
    u.uProjectionMatrixInverse.value.copy(this.camera.projectionMatrixInverse);
    u.uProjectionMatrix.value.copy(this.camera.projectionMatrix);
    u.uViewMatrix.value.copy(this.camera.matrixWorldInverse);
    
    // Render pipeline
    this.composer.render();
  }
}
