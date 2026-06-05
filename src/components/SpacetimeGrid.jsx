import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ═══════════════════════════════════════════════════════════════════════
   SPACETIME GRID — Curved warped mesh with gravitational wave ripples
   and funnel shape near event horizon
═══════════════════════════════════════════════════════════════════════ */
const GRID_VERT = /* glsl */`
  uniform float uMass;
  uniform float uTime;
  varying float vDepth;
  varying float vR;

  void main(){
    vec3 pos = position;
    float r  = length(pos.xy);
    float Rs = 2.0*uMass;

    // Einstein-Rosen bridge funnel: z = -k/r
    float k     = uMass * 7.0;
    float depth = -k / (r + Rs * 0.4);

    // Inside photon sphere: steeper funnel
    if(r < Rs*1.5){
      depth -= (Rs*1.5 - r)*4.0;
    }

    // Gravitational wave ripple (GW emission from inspiraling matter)
    float wave = sin(r*1.8 - uTime*3.0) * 0.12 * exp(-r*0.06);

    pos.z = depth + wave;
    vDepth = pos.z;
    vR = r;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const GRID_FRAG = /* glsl */`
  precision highp float;
  uniform float uMass;
  uniform float uTime;
  varying float vDepth;
  varying float vR;

  void main(){
    float Rs = 2.0*uMass;

    // Fade out far from BH
    float farFade  = smoothstep(28.0, 6.0, vR);
    // Brighten in the funnel
    float deepGlow = smoothstep(-1.0, -12.0, vDepth);

    float alpha = farFade * (0.22 + deepGlow*0.45);

    // Color: dim indigo far, bright electric cyan in funnel
    vec3 farColor  = vec3(0.05, 0.10, 0.50);
    vec3 nearColor = vec3(0.20, 0.65, 1.00);
    vec3 color = mix(farColor, nearColor, deepGlow);

    // GW pulse highlight
    float gwPulse = sin(vR*1.8 - uTime*3.0) * exp(-vR*0.06);
    color += vec3(0.1, 0.3, 0.5) * gwPulse * 0.3;

    gl_FragColor = vec4(color, alpha);
  }
`

export default function SpacetimeGrid({ mass = 1, showGrid = true }) {
  const matRef = useRef()

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime
      matRef.current.uniforms.uMass.value = mass
    }
  })

  if (!showGrid) return null

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
      <planeGeometry args={[70, 70, 100, 100]} />
      <shaderMaterial
        ref={matRef}
        wireframe={true}
        transparent={true}
        depthWrite={false}
        uniforms={{
          uMass: { value: mass },
          uTime: { value: 0 },
        }}
        vertexShader={GRID_VERT}
        fragmentShader={GRID_FRAG}
      />
    </mesh>
  )
}
