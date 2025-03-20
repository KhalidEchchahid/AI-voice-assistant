"use client"

import { useState, useEffect } from "react"

interface VideoSectionProps {
  videoId: string
}

export default function VideoSection({ videoId }: VideoSectionProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-amber-400">شاهد</span> الماكينة في العمل
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            شاهد كيف تعمل ماكينة الحلاقة الذهبية 3 في 1 وتعرف على مميزاتها الفريدة
          </p>
        </div>
        <div className="w-full h-96 bg-gray-800 rounded-xl flex items-center justify-center">
          <p className="text-gray-400">جاري تحميل الفيديو...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="text-amber-400">شاهد</span> الماكينة في العمل
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          شاهد كيف تعمل ماكينة الحلاقة الذهبية 3 في 1 وتعرف على مميزاتها الفريدة
        </p>
      </div>
      <div className="w-full max-w-3xl mx-auto">
        <div className="relative pb-[177.78%] h-0 rounded-xl overflow-hidden">
          <iframe
            className="absolute top-0 left-0 w-full h-full rounded-xl"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&rel=0&showinfo=0`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </section>
  )
}

