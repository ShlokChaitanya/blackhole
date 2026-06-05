import { create } from 'zustand'

export const useStore = create((set) => ({
  // ── Simulation Controls ──
  mass:          1.0,
  spin:          0.5,
  accretionRate: 1.0,
  inclination:   15.0,
  fov:           50.0,

  // ── Visibility Toggles ──
  showDisk:          true,
  showPhotonRing:    true,
  showLensing:       true,
  showGrid:          false,
  showStarfield:     true,

  // ── Setters ──
  setMass:          (m) => set({ mass: m }),
  setSpin:          (s) => set({ spin: s }),
  setAccretionRate: (a) => set({ accretionRate: a }),
  setInclination:   (i) => set({ inclination: i }),
  setFov:           (f) => set({ fov: f }),
  setToggle:        (key, value) => set({ [key]: value }),
}))
