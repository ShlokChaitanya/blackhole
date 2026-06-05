import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Trail } from '@react-three/drei'
import { useStore } from '../store'

const G = 1.0
const c = 1.0

// Reuse vectors to avoid GC pressure
const _pos = new THREE.Vector3()
const _vel = new THREE.Vector3()
const _acc = new THREE.Vector3()
const _rHat = new THREE.Vector3()
const _k1p = new THREE.Vector3(), _k1v = new THREE.Vector3()
const _k2p = new THREE.Vector3(), _k2v = new THREE.Vector3()
const _k3p = new THREE.Vector3(), _k3v = new THREE.Vector3()
const _k4p = new THREE.Vector3(), _k4v = new THREE.Vector3()
const _tmpP = new THREE.Vector3(), _tmpV = new THREE.Vector3()

function computeAcc(p, v, mass, outP, outV) {
  const r = p.length()
  outP.copy(v)
  if (r < 1e-3) {
    outV.set(0, 0, 0)
    return
  }
  const Rs = 2 * G * mass
  _rHat.copy(p).normalize().multiplyScalar(-1)
  const aN = (G * mass) / (r * r)
  const pnCorr = 1 + (3 * G * mass) / (r * c * c) + (1.5 * G * mass * v.lengthSq()) / (r * c * c)
  const gwDrag = 5e-3 / Math.pow(Math.max(r, 0.4), 3)
  
  outV.copy(_rHat).multiplyScalar(aN * pnCorr)
  outV.addScaledVector(v, -gwDrag)
}

function rk4(p, v, mass, dt, outP, outV) {
  computeAcc(p, v, mass, _k1p, _k1v)

  _tmpP.copy(p).addScaledVector(_k1p, dt * 0.5)
  _tmpV.copy(v).addScaledVector(_k1v, dt * 0.5)
  computeAcc(_tmpP, _tmpV, mass, _k2p, _k2v)

  _tmpP.copy(p).addScaledVector(_k2p, dt * 0.5)
  _tmpV.copy(v).addScaledVector(_k2v, dt * 0.5)
  computeAcc(_tmpP, _tmpV, mass, _k3p, _k3v)

  _tmpP.copy(p).addScaledVector(_k3p, dt)
  _tmpV.copy(v).addScaledVector(_k3v, dt)
  computeAcc(_tmpP, _tmpV, mass, _k4p, _k4v)

  outP.copy(p)
    .addScaledVector(_k1p, dt / 6).addScaledVector(_k2p, dt / 3)
    .addScaledVector(_k3p, dt / 3).addScaledVector(_k4p, dt / 6)
  outV.copy(v)
    .addScaledVector(_k1v, dt / 6).addScaledVector(_k2v, dt / 3)
    .addScaledVector(_k3v, dt / 3).addScaledVector(_k4v, dt / 6)
}

function circV(r, mass) { return Math.sqrt(G * mass / r) }

function OrbitalParticle({ id, initPos, initVel, mass, color, isPlunging }) {
  const meshRef = useRef()
  const p = useRef(initPos.clone())
  const v = useRef(initVel.clone())
  const alive = useRef(true)
  const Rs = 2 * G * mass
  const addPt = useStore((s) => s.addDecayDataPoint)

  useFrame((state, delta) => {
    if (!alive.current || !meshRef.current) return
    const dt = Math.min(delta, 0.033)
    rk4(p.current, v.current, mass, dt, _tmpP, _tmpV)
    p.current.copy(_tmpP)
    v.current.copy(_tmpV)
    meshRef.current.position.copy(p.current)
    
    const r = p.current.length()
    if (isPlunging) {
      const t = state.clock.elapsedTime
      if (Math.floor(t * 8) > Math.floor((t - delta) * 8)) {
        addPt(+t.toFixed(1), +r.toFixed(3))
      }
    }
    if (r <= Rs * 1.01) {
      alive.current = false
      meshRef.current.visible = false
    }
  })

  return (
    <Trail width={0.4} length={180} color={color} attenuation={(t) => t * t}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </Trail>
  )
}

export default function ParticleSystem({ mass = 1, showTrajectories = true }) {
  const Rs = 2 * mass
  const particles = useMemo(() => {
    const rStable = 10, rIso = Rs * 1.3, rPlunge = Rs * 1.8, rCap = Rs * 1.15
    return [
      { id: 's', initPos: new THREE.Vector3(rStable, 0, 0), initVel: new THREE.Vector3(0, 0, -circV(rStable, mass)), color: new THREE.Color(4, 4, 4), isPlunging: false },
      { id: 'm', initPos: new THREE.Vector3(rIso, 0, 0), initVel: new THREE.Vector3(0, 0, -circV(rIso, mass) * 0.98), color: new THREE.Color(0.2, 0.8, 5), isPlunging: false },
      { id: 'p', initPos: new THREE.Vector3(rPlunge, 0, 0), initVel: new THREE.Vector3(0, 0, -circV(rPlunge, mass) * 0.7), color: new THREE.Color(5, 3, 0.2), isPlunging: true },
      { id: 'c', initPos: new THREE.Vector3(rCap, 0, 0.5), initVel: new THREE.Vector3(0.1, 0, 0.1), color: new THREE.Color(5, 0.2, 0.1), isPlunging: false },
    ]
  }, [mass, Rs])

  if (!showTrajectories) return null
  return <group>{particles.map((p) => <OrbitalParticle key={p.id} {...p} mass={mass} />)}</group>
}
