import React, { useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BlackHoleRenderer } from '../lib/BlackHoleRenderer'
import { useStore } from '../store'

export default function BlackHole({ mass = 1, spin = 1, accretionRate = 1, showDisk = true, showPhotonRing = true, showLensing = true, inclination = 15, fov = 50 }) {
  const { gl, scene, camera, size } = useThree()
  
  const [bhRenderer, setBhRenderer] = useState(null)
  
  useEffect(() => {
    const renderer = new BlackHoleRenderer(gl, scene, camera)
    setBhRenderer(renderer)
    
    return () => {
      renderer.composer.dispose()
    }
  }, [gl, scene, camera])
  
  useEffect(() => {
    if (bhRenderer) {
      bhRenderer.resize(size.width, size.height)
    }
  }, [size, bhRenderer])

  // In a true volumetric shader, inclination corresponds to rotating the camera's orbit around the black hole.
  // Since OrbitControls handles camera orbit, we don't strictly need to manually rotate the disk here
  // But if we want to force inclination, we could pass it to the shader or adjust the camera.
  // We'll leave OrbitControls for user interaction.
  
  useFrame((state, delta) => {
    if (bhRenderer) {
      bhRenderer.update({
        mass,
        spin,
        accretionRate,
        showDisk,
        showLensing
      }, delta)
    }
  }, 1)

  return null
}

