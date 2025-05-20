"use client"

import { useEffect, useRef } from "react"

export default function VisualFeedback() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const barCount = 5
    const barWidth = 4
    const barGap = 6
    const barMaxHeight = 30

    let animationFrameId: number

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Draw sound wave bars
      ctx.fillStyle = "rgb(59, 130, 246)" // blue-500

      for (let i = 0; i < barCount; i++) {
        const x = centerX + (i - Math.floor(barCount / 2)) * (barWidth + barGap)

        // Generate random height for animation effect
        const randomHeight = Math.random() * barMaxHeight + 5

        ctx.fillRect(x - barWidth / 2, centerY - randomHeight / 2, barWidth, randomHeight)
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="mt-2 mb-4">
      <canvas ref={canvasRef} width={120} height={60} className="rounded-md" />
    </div>
  )
}
