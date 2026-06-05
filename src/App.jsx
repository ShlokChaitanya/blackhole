import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import {
  Settings, Activity, Disc, Target, Map, Zap, Radio, Eye, EyeOff,
  Atom, BarChart2, Gauge, ChevronLeft, ChevronRight, Menu
} from 'lucide-react'

import { useStore } from './store'
import BlackHole      from './components/BlackHole'
import ParticleSystem from './components/ParticleSystem'
import SpacetimeGrid  from './components/SpacetimeGrid'
import Starfield      from './components/Starfield'

/* ═══════════════════════════════════════════════════════════════════════
   3-D SCENE
═══════════════════════════════════════════════════════════════════════ */
function Scene() {
  const { mass, spin, showDisk, showPhotonRing, showGrid, showStarfield, inclination, fov, accretionRate, showLensing } = useStore()
  return (
    <>
      {showStarfield && <Starfield />}
      <BlackHole mass={mass} spin={spin} showDisk={showDisk} showPhotonRing={showPhotonRing} accretionRate={accretionRate} showLensing={showLensing} inclination={inclination} fov={fov} />
      <ParticleSystem mass={mass} showTrajectories={false} />
      <SpacetimeGrid  mass={mass} showGrid={showGrid} />
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   MATH HELPERS FOR CHARTS
═══════════════════════════════════════════════════════════════════════ */
function useOrbitalDecayData(mass) {
  return useMemo(() => {
    const data = []
    const inspiralTime = 100 * (mass / 3.15) // Scale time by mass
    for (let t = 0; t <= 100; t += 2) {
      // Basic GW inspiral approximation r ~ (t_merge - t)^(1/4)
      let r = 0
      if (t < inspiralTime) {
        r = Math.pow(1 - t / inspiralTime, 0.25)
      }
      data.push({ time: t, radius: r })
    }
    return data
  }, [mass])
}

function useLensingData(mass, spin) {
  return useMemo(() => {
    const data = []
    // Photon ring impact parameter for Schwarzschild is ~ 5.196 * M
    // For Kerr it depends on spin, but we approximate to show the distinct peaks
    const pr = 5.196 * mass * (1 - spin * 0.15) 
    const isco = 6 * mass * (1 - spin * 0.5) // approximate ISCO shift with spin

    for (let b = 0; b <= 15; b += 0.2) {
      // Direct emission broad peak around ISCO
      const direct = Math.exp(-Math.pow(b - isco, 2) / 8) * 0.8
      // Lensed (Far side) emission, peaks closer to photon ring
      const lensed = Math.exp(-Math.pow(b - (pr + 0.5), 2) / 2) * 0.5
      // Photon ring, very sharp peak exactly at photon ring impact parameter
      const photon = Math.exp(-Math.pow(b - pr, 2) / 0.1) * 1.0

      data.push({ b, direct, lensed, photon })
    }
    return data
  }, [mass, spin])
}

/* ═══════════════════════════════════════════════════════════════════════
   SPACETIME CURVATURE CANVAS
═══════════════════════════════════════════════════════════════════════ */
function SpacetimeCurvatureChart({ mass }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    const imgData = ctx.createImageData(w, h)
    
    // Create a 2D heatmap mapping z = -2M / r to a color scale
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Map pixel to space
        const spaceX = (x - w/2) / (w/2) * 10
        const spaceY = (y - h/2) / (h/2) * 6
        const r = Math.sqrt(spaceX*spaceX + spaceY*spaceY)
        
        let z = 0
        if (r > 0.1) {
          z = -(2 * mass) / r
        } else {
          z = -20 // clamp deep well
        }

        // Map z [-2.0, 0] to color
        // -2.0 is Blue, -1.0 is Orange, 0 is Black/Dark Red
        let r_col, g_col, b_col
        
        if (z < -1.5) {
          // Deep well -> Blueish white
          const t = Math.max(0, (z + 2.0) / 0.5)
          r_col = 56 + t * 200; g_col = 189 + t * 66; b_col = 248 + t * 7;
        } else if (z < -0.5) {
          // Mid well -> Orange
          const t = (z + 1.5) / 1.0
          r_col = 249 + t * 6; g_col = 115 - t * 115; b_col = 22 - t * 22;
        } else {
          // Outer -> Black/Dark Red
          const t = Math.max(0, (z + 0.5) / 0.5)
          r_col = 20 * t; g_col = 5 * t; b_col = 10 * t;
        }

        const idx = (y * w + x) * 4
        imgData.data[idx]   = Math.min(255, r_col)
        imgData.data[idx+1] = Math.min(255, g_col)
        imgData.data[idx+2] = Math.min(255, b_col)
        imgData.data[idx+3] = 255
      }
    }
    ctx.putImageData(imgData, 0, 0)
    
    // Draw Grid overlay
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for(let i=0; i<=w; i+=w/10) { ctx.moveTo(i, 0); ctx.lineTo(i, h) }
    for(let i=0; i<=h; i+=h/6) { ctx.moveTo(0, i); ctx.lineTo(w, i) }
    ctx.stroke()
    
    // Draw singularity point
    ctx.fillStyle = 'black'
    ctx.beginPath()
    ctx.arc(w/2, h/2, 4, 0, Math.PI*2)
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 1.5
    ctx.stroke()
    
  }, [mass])

  return (
    <div className="relative w-full h-[140px] rounded overflow-hidden" style={{ height: 140 }}>
      <canvas ref={canvasRef} width={240} height={140} className="w-full h-full" />
      <div className="absolute right-2 top-2 bottom-2 flex flex-col justify-between items-end text-[8px] font-mono text-white/50">
        <span>0.0</span>
        <span>-0.5</span>
        <span>-1.0</span>
        <span>-1.5</span>
        <span>-2.0</span>
      </div>
      <div className="absolute right-0 top-2 bottom-2 w-1" style={{ background: 'linear-gradient(to bottom, #000, #f97316, #38bdf8, #fff)' }}></div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD UI
═══════════════════════════════════════════════════════════════════════ */
function Dashboard() {
  const {
    mass, setMass,
    spin, setSpin,
    accretionRate, setAccretionRate,
    inclination, setInclination,
    fov, setFov,
    showDisk, showPhotonRing, showLensing, showGrid, showStarfield,
    setToggle,
  } = useStore()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Derived physics values
  const Rs      = (2 * mass).toFixed(3)
  const photon  = (3 * mass).toFixed(3)
  const isco    = (6 * mass * (1 - spin * 0.5)).toFixed(3)
  const td      = (1 / Math.sqrt(Math.max(1 - 2 * mass / (6 * mass), 0.001))).toFixed(4)
  const redshift= (Math.sqrt(1 - 2 * mass / (6 * mass)) - 1 + 0.5).toFixed(3) // rough proxy

  const decayData = useOrbitalDecayData(mass)
  const lensingData = useLensingData(mass, spin)

  return (
    <div className="dashboard-root">
      {/* ── HEADER ── */}
      <header className="dashboard-header animate-fade-in">
        <div className="flex items-center gap-3">
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '1px solid rgba(249,115,22,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(249,115,22,0.08)',
          }}>
            <Disc size={18} color="#f97316" className="animate-spin-slow" />
          </div>
          <div>
            <p style={{ fontSize: 9, letterSpacing: '0.32em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 2 }}>
              Relativistic Simulation Engine v2.2
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1, color: '#fff' }}>
              EVENT<span style={{ color: '#f97316' }}>HORIZON</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex pointer-events-auto" style={{
            alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 999,
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16,185,129,0.25)',
          }}>
            <div className="animate-pulse-slow" style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(16,185,129,0.9)', textTransform: 'uppercase' }}>LIVE SIM</span>
          </div>
          <button className="lg:hidden pointer-events-auto p-2 rounded-lg bg-white/5 border border-white/10 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu size={20} /></button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className={`dashboard-body ${mobileMenuOpen ? 'mobile-visible' : ''}`}>

        {/* ─── LEFT PANEL: METRICS & DATA ─── */}
        <div className={`panel-container left-panel ${mobileMenuOpen ? 'flex' : 'hidden lg:flex'}`}>
          <GlassPanel>
            <PanelHeader icon={<Radio size={13} />} title="BLACK HOLE METRICS" accent="#f97316" />
            <div className="grid grid-cols-2" style={{ gap: '16px 8px', marginTop: 8 }}>
              <Metric label="MASS" value={mass.toFixed(2)} unit="M☉" glow="#f97316" />
              <Metric label="EVENT HORIZON" value={Rs} unit="km" glow="#f97316" />
              <Metric label="PHOTON SPHERE" value={photon} unit="km" />
              <Metric label="ISCO RADIUS" value={isco} unit="km" />
              <Metric label="TIME DILATION" value={td} unit="×" />
              <Metric label="REDSHIFT" value={redshift} unit="z" />
            </div>
          </GlassPanel>

          <GlassPanel className="flex-1">
            <PanelHeader icon={<Activity size={13} />} title="ORBITAL DECAY (GW INSPIRAL)" accent="#f97316" />
            <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={decayData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}s`} />
                  <YAxis domain={[0, 1]} ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(5,5,8,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 }} labelFormatter={() => ''} />
                  <Line type="monotone" dataKey="radius" stroke="#f97316" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          <GlassPanel>
            <PanelHeader icon={<Map size={13} />} title="SCENE LAYERS" accent="#a78bfa" />
            <div className="flex flex-col gap-1.5" style={{ marginTop: 8 }}>
              <Toggle label="Accretion Disk"   icon={<Disc size={12} />} on={showDisk} set={(v) => setToggle('showDisk', v)} accent="#f97316" />
              <Toggle label="Photon Ring"      icon={<Target size={12} />} on={showPhotonRing} set={(v) => setToggle('showPhotonRing', v)} accent="#fbbf24" />
              <Toggle label="Relativistic Lensing" icon={<Zap size={12} />} on={showLensing} set={(v) => setToggle('showLensing', v)} accent="#38bdf8" />
              <Toggle label="Spacetime Grid"   icon={<Map size={12} />} on={showGrid} set={(v) => setToggle('showGrid', v)} accent="#a78bfa" />
              <Toggle label="Star Field"       icon={<Atom size={12} />} on={showStarfield} set={(v) => setToggle('showStarfield', v)} accent="#fbbf24" />
            </div>
          </GlassPanel>
        </div>

        <div className="spacer" />

        {/* ─── RIGHT PANEL: PARAMETERS & CHARTS ─── */}
        <div className={`panel-container right-panel ${mobileMenuOpen ? 'flex' : 'hidden lg:flex'}`}>
          <GlassPanel>
            <PanelHeader icon={<Target size={13} />} title="SIMULATION CONTROLS" accent="#f97316" />
            <div className="flex flex-col gap-3" style={{ marginTop: 8 }}>
              <Slider id="slider-mass" label="Mass (M☉)" value={mass} min={0.2} max={5} step={0.05} onChange={setMass} accent="#f97316" />
              <Slider id="slider-spin" label="Spin (a*)" value={spin} min={0} max={0.998} step={0.002} onChange={setSpin} accent="#f97316" />
              <Slider id="slider-acc" label="Accretion Rate (Ṁ)" value={accretionRate} min={0} max={2} step={0.01} onChange={setAccretionRate} accent="#a78bfa" />
              <Slider id="slider-inc" label="Inclination (°)" value={inclination} min={0} max={90} step={1} onChange={setInclination} accent="#a78bfa" />
              <Slider id="slider-fov" label="Field of View (°)" value={fov} min={10} max={120} step={1} onChange={setFov} accent="#a78bfa" />
            </div>
          </GlassPanel>

          <GlassPanel>
            <PanelHeader icon={<Activity size={13} />} title="GRAVITATIONAL LENSING" accent="#f97316" />
            <div className="flex flex-col gap-1" style={{ marginBottom: 8 }}>
              <div className="flex items-center gap-2"><div style={{ width: 8, height: 2, background: '#eab308' }}></div><span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>Direct Emission</span></div>
              <div className="flex items-center gap-2"><div style={{ width: 8, height: 2, borderTop: '2px dashed #3b82f6' }}></div><span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>Lensed (Far Side)</span></div>
              <div className="flex items-center gap-2"><div style={{ width: 8, height: 2, background: '#ffffff' }}></div><span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>Photon Ring</span></div>
            </div>
            <div className="relative" style={{ height: 100 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lensingData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="b" hide />
                  <YAxis domain={[0, 1.2]} hide />
                  <Line type="monotone" dataKey="direct" stroke="#eab308" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  <Line type="monotone" dataKey="lensed" stroke="#3b82f6" strokeDasharray="3 3" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  <Line type="monotone" dataKey="photon" stroke="#ffffff" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                  {/* Black hole mask approximation */}
                  <Area type="step" dataKey={() => 0.5} fill="#000" stroke="#fff" strokeWidth={1} />
                </LineChart>
              </ResponsiveContainer>
              <div className="absolute" style={{ bottom: 24, left: '50%', transform: 'translateX(-50%)', width: 32, height: 32, borderRadius: '50%', background: '#000', border: '1px solid #fff' }}></div>
            </div>
          </GlassPanel>

          <GlassPanel>
            <PanelHeader icon={<Map size={13} />} title="SPACETIME CURVATURE (2D SLICE)" accent="#38bdf8" />
            <SpacetimeCurvatureChart mass={mass} />
          </GlassPanel>
        </div>
      </div>

      {/* ── BOTTOM STATUS BAR ── */}
      <footer className="dashboard-footer hidden md:flex animate-fade-in">
        {[
          { label: 'EVENT HORIZON', value: `${Rs} km`, color: '#f97316' },
          { label: 'PHOTON SPHERE', value: `${photon} km`, color: '#eab308' },
          { label: 'ISCO RADIUS', value: `${isco} km`, color: '#6366f1' },
          { label: 'TIME DILATION', value: `${td} ×`, color: '#3b82f6' },
          { label: 'REDSHIFT', value: `${redshift} z`, color: '#ef4444' },
          { label: 'SIMULATION TIME', value: `00:02:47:18`, color: '#a1a1aa' },
        ].map((item, i) => (
          <div key={item.label} className="flex items-center gap-4">
            {i !== 0 && <div className="w-[1px] h-4 bg-white/10" />}
            <div className="flex flex-col">
              <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{item.label}</p>
              <p style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: item.color }}>{item.value}</p>
            </div>
          </div>
        ))}
      </footer>
    </div>
  )
}

function GlassPanel({ children, className = "" }) { return <div className={`glass-panel ${className}`}>{children}</div> }
function PanelHeader({ icon, title, accent }) {
  return (
    <div className="flex items-center gap-2 pb-2 mb-1 border-b border-white/5">
      <span style={{ color: accent }}>{icon}</span>
      <h2 style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>{title}</h2>
    </div>
  )
}
function Slider({ id, label, value, min, max, step, onChange, accent }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-2">
        <label htmlFor={id} style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{label}</label>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: '#fff' }}>{value.toFixed(2)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ background: `linear-gradient(to right, ${accent} ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }} />
    </div>
  )
}
function Toggle({ label, icon, on, set, accent }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span style={{ color: accent }}>{icon}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{label}</span>
      </div>
      <button onClick={() => set(!on)} style={{ width: 32, height: 16, borderRadius: 16, background: on ? '#f97316' : 'rgba(255,255,255,0.2)', position: 'relative', transition: 'all 0.2s', border: 'none', cursor: 'pointer' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: on ? 18 : 2, transition: 'all 0.2s' }} />
      </button>
    </div>
  )
}
function Metric({ label, value, unit, glow }) {
  return (
    <div className="flex flex-col">
      <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: '500', color: glow || '#fff' }}>{value}<span style={{ fontSize: 10, color: glow || '#f97316', marginLeft: 4 }}>{unit}</span></p>
    </div>
  )
}

export default function App() {
  const { fov } = useStore()
  return (
    <div className="w-full h-full relative overflow-hidden bg-black" style={{ width: '100vw', height: '100vh' }}>
      <Canvas className="absolute inset-0 z-0" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} camera={{ position: [0, 12, 24], fov: fov }} gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.6 }} dpr={[1, 2]}>
        <ambientLight intensity={0.002} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={8} maxDistance={65} autoRotate autoRotateSpeed={0.2} maxPolarAngle={Math.PI * 0.7} minPolarAngle={Math.PI * 0.1} target={[0, 0, 0]} />
      </Canvas>
      <Dashboard />
    </div>
  )
}

