import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ═══════════════════════════════════════════════════════════════════════
   STARFIELD + BACKGROUND — Dense star field, Milky Way band,
   lens-distorted stars near center
═══════════════════════════════════════════════════════════════════════ */
const BG_VERT = /* glsl */`
  varying vec3 vDir;
  void main(){
    vDir = (modelMatrix * vec4(position, 0.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const BG_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  varying vec3 vDir;

  // --- Noise helpers ---
  vec4 _perm(vec4 x){ return mod(((x*34.0)+1.0)*x,289.0); }
  vec4 _tis(vec4 r){ return 1.79284291400159-0.85373472095314*r; }
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);
    const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.0-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod(i,289.0);
    vec4 p=_perm(_perm(_perm(
      i.z+vec4(0.0,i1.z,i2.z,1.0))
      +i.y+vec4(0.0,i1.y,i2.y,1.0))
      +i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;
    vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);
    vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;
    vec4 s1=floor(b1)*2.0+1.0;
    vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=_tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
    m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  float fbm(vec3 p){
    float f=0.0,w=0.5;
    for(int i=0;i<5;i++){f+=w*snoise(p);p*=2.03;w*=0.5;}
    return f;
  }

  void main(){
    vec3 dir = normalize(vDir);

    // --- Gravitational lensing distortion ---
    float centerDist = length(dir.xz);
    float lensStr = smoothstep(0.6, 0.0, centerDist) * 0.12;
    vec3 lensedDir = normalize(dir + normalize(vec3(dir.x,0.0,dir.z))*lensStr);

    // --- Dense star field ---
    float s1 = snoise(lensedDir * 120.0 + vec3(3.7,1.2,8.4));
    float s2 = snoise(lensedDir * 280.0 + vec3(11.0,5.3,2.1));
    float s3 = snoise(lensedDir * 520.0 + vec3(0.1,22.0,9.5));
    float s4 = snoise(lensedDir * 95.0  + vec3(7.7,13.1,4.8));
    float s5 = snoise(lensedDir * 740.0 + vec3(1.3,3.5,17.2));

    float star1 = smoothstep(0.85, 1.0, s1) * 1.0;
    float star2 = smoothstep(0.88, 1.0, s2) * 0.7;
    float star3 = smoothstep(0.92, 1.0, s3) * 0.5;
    float star4 = smoothstep(0.90, 1.0, s4) * 0.8;
    float star5 = smoothstep(0.94, 1.0, s5) * 0.35;
    float starBright = star1 + star2 + star3 + star4 + star5;

    // Neutral star colors
    float hue = snoise(lensedDir * 60.0) * 0.5 + 0.5;
    vec3 starColor = mix(vec3(0.9, 0.95, 1.0), vec3(1.0, 0.9, 0.8), hue);
    starColor *= starBright * 3.5;

    // --- Milky Way band (Maximum Contrast) ---
    float bandY   = abs(dir.y);
    float band    = smoothstep(0.5, 0.0, bandY);
    float milky1  = fbm(lensedDir * 2.8 + vec3(uTime*0.003,0,0));
    float milky   = smoothstep(0.1, 0.7, milky1) * 0.8;
    milky        *= band;
    
    // Deep blue to black
    vec3 milkyColor = mix(
      vec3(0.0, 0.0, 0.0),       // Absolute black
      vec3(0.01, 0.015, 0.04),   // Faint steel blue
      milky
    );

    // --- Nebula patches (Extremely faint) ---
    float neb = fbm(dir * 2.0 + vec3(0.4,0.1,-0.2)) * 0.5 + 0.5;
    vec3 nebColor = mix(
      vec3(0.0, 0.0, 0.0),       // Absolute black
      vec3(0.005, 0.005, 0.015), // Near-invisible blue
      smoothstep(0.3, 0.8, neb)
    ) * 0.4;

    vec3 finalColor = nebColor + milkyColor + starColor;
    // Apply overall dimming for high-contrast "real" space
    finalColor *= 0.65;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

export default function Starfield() {
  const matRef = useRef()
  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh>
      <sphereGeometry args={[95, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={{ uTime: { value: 0 } }}
        vertexShader={BG_VERT}
        fragmentShader={BG_FRAG}
      />
    </mesh>
  )
}
