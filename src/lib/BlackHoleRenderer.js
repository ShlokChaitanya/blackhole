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

    // Disk density function
    float diskDensity(vec3 p, float isco, float outerEdge) {
      float r = length(p.xz);
      if(r < isco || r > outerEdge) return 0.0;
      
      // vertical falloff
      float h = abs(p.y);
      float maxH = 0.5 + (r - isco) * 0.1;
      if (h > maxH) return 0.0;
      
      float vDensity = 1.0 - (h / maxH);
      
      // Radial falloff
      float rDensity = smoothstep(isco, isco + 2.0, r) * smoothstep(outerEdge, outerEdge - 5.0, r);
      
      // Spiral noise
      float theta = atan(p.z, p.x);
      float omega = sqrt(uMass / pow(r, 3.0));
      float angle = theta - uTime * omega * 3.0;
      
      float n = fbm(vec3(r * 0.5, angle * 4.0, uTime * 0.2));
      float lanes = smoothstep(0.3, 0.7, n);
      
      return vDensity * rDensity * lanes * uAccretionRate;
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
      for(int i = 0; i < 200; i++) {
        float r2 = dot(rayPos, rayPos);
        float r = sqrt(r2);
        
        minR = min(minR, r);
        
        if(r < Rs) {
          hitEH = true;
          break;
        }
        
        // Adaptive step size based on distance to black hole.
        // Smaller steps near the event horizon create a razor-sharp edge!
        dt = max(0.015, (r - Rs) * 0.15);

        // Gravity bending
        if (uShowLensing > 0.5) {
          // Acceleration a = -1.5 * Rs * L^2 * pos / r^5  (approximation for light)
          // For simplicity, we use a basic inward pull that roughly matches Schwarzschild
          vec3 pull = -rayPos * (Rs * 0.8 / (r2 * r));
          rayDir += pull * dt;
          rayDir = normalize(rayDir);
        }

        // Sample Accretion Disk
        if (uShowDisk > 0.5 && abs(rayPos.y) < 5.0 && r < outerEdge && r > isco) {
          float density = diskDensity(rayPos, isco, outerEdge);
          if (density > 0.0) {
            // Temperature mapping
            float t_norm = (r - isco) / (outerEdge - isco);
            vec3 hotColor = vec3(1.0, 0.8, 0.4);
            vec3 midColor = vec3(1.0, 0.3, 0.05);
            vec3 coldColor = vec3(0.2, 0.0, 0.0);
            
            vec3 emit = mix(midColor, hotColor, smoothstep(0.1, 0.0, t_norm));
            emit = mix(coldColor, emit, smoothstep(0.8, 0.3, t_norm));
            
            // Doppler beaming
            float theta = atan(rayPos.z, rayPos.x);
            vec3 vel = vec3(-sin(theta), 0.0, cos(theta));
            float doppler = dot(vel, -rayDir) * sqrt(uMass / r) * 1.5;
            float beaming = pow(max(1.0 + doppler, 0.0), 3.0);
            
            emit *= beaming * density * 2.0 * dt;
            
            color += emit * transmittance;
            transmittance *= exp(-density * 5.0 * dt);
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
