"use client"

import { useEffect, useRef } from "react"

interface VisionProcessingAnimationProps {
  active: boolean
}

export default function VisionProcessingAnimation({ active }: VisionProcessingAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2

    // Animation properties
    const maxRadius = 30
    const minRadius = 20
    const pulseSpeed = 0.05

    let phase = 0
    let animationFrameId: number

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Calculate current radius based on sine wave
      const radius = minRadius + ((Math.sin(phase) + 1) / 2) * (maxRadius - minRadius)
      phase += pulseSpeed

      // Draw scanning circle
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(99, 102, 241, 0.6)" // indigo-500 with transparency
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw crosshair
      ctx.beginPath()
      ctx.moveTo(centerX - 15, centerY)
      ctx.lineTo(centerX + 15, centerY)
      ctx.moveTo(centerX, centerY - 15)
      ctx.lineTo(centerX, centerY + 15)
      ctx.strokeStyle = "rgba(99, 102, 241, 0.8)" // indigo-500 with more opacity
      ctx.lineWidth = 1
      ctx.stroke()

      // Draw small center dot
      ctx.beginPath()
      ctx.arc(centerX, centerY, 2, 0, Math.PI * 2)
      ctx.fillStyle = "rgb(99, 102, 241)" // indigo-500
      ctx.fill()

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [active])

  if (!active) return null

  return (
    <div className="mt-2 mb-4">
      <canvas ref={canvasRef} width={100} height={100} className="rounded-md" />
    </div>
  )
}
