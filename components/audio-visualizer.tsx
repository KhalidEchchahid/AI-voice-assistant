"use client"

import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface AudioVisualizerProps {
  active: boolean
  className?: string
}

export default function AudioVisualizer({ active, className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const setCanvasDimensions = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
    }

    setCanvasDimensions()
    window.addEventListener("resize", setCanvasDimensions)

    // Animation variables
    const bars = 20
    const barWidth = canvas.offsetWidth / bars - 2
    const maxBarHeight = canvas.offsetHeight * 0.7
    const barHeights = Array(bars).fill(0)
    const targetHeights = Array(bars).fill(0)

    // Animation function
    const animate = () => {
      if (!active) {
        // Fade out animation when not active
        const allZero = barHeights.every((height) => Math.abs(height) < 0.1)
        if (allZero) {
          ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
          return
        }
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

      // Update target heights when active
      if (active) {
        for (let i = 0; i < bars; i++) {
          // Random height with higher probability in the middle
          const centerFactor = 1 - Math.abs((i - bars / 2) / (bars / 2)) * 0.5
          targetHeights[i] = Math.random() * maxBarHeight * centerFactor
        }
      } else {
        // When not active, target height is 0
        targetHeights.fill(0)
      }

      // Smooth transition to target heights
      for (let i = 0; i < bars; i++) {
        barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.05
      }

      // Draw bars
      ctx.fillStyle = "#6366f1" // Indigo color

      for (let i = 0; i < bars; i++) {
        const x = i * (barWidth + 2) + 1
        const height = barHeights[i]
        const y = (canvas.offsetHeight - height) / 2

        // Draw rounded bars
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, height, 4)
        ctx.fill()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    // Start animation
    animate()

    return () => {
      window.removeEventListener("resize", setCanvasDimensions)
      cancelAnimationFrame(animationRef.current)
    }
  }, [active])

  return <canvas ref={canvasRef} className={cn("w-full h-16", className)} />
}
