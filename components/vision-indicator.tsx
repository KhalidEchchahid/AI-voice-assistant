"use client"

import { Eye } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface VisionIndicatorProps {
  active: boolean
  className?: string
}

export default function VisionIndicator({ active, className }: VisionIndicatorProps) {
  if (!active) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={cn(
          "flex items-center justify-center p-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30",
          className,
        )}
      >
        <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      </div>
    </motion.div>
  )
}
