import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronRight, Star } from "lucide-react"
import Link from "next/link"

interface HeroSectionProps {
  price: string
}

export default function HeroSection({ price }: HeroSectionProps) {
  return (
    <section className="container mx-auto px-4 py-12 md:py-24">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="relative">
          <div className="absolute -inset-4 bg-amber-500/20 rounded-full blur-3xl opacity-30"></div>
          <Image
            src="/images/6.png"
            alt="ماكينة الحلاقة الذهبية 3 في 1"
            width={600}
            height={600}
            className="relative z-10 mx-auto"
          />
        </div>
        <div className="space-y-6 text-center md:text-right">
          <div className="inline-block bg-amber-500/10 px-4 py-1 rounded-full text-amber-400 font-medium">
            العرض الحصري - خصم 30%
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            <span className="text-amber-400">ماكينة الحلاقة الذهبية</span> 3 في 1
          </h1>
          <p className="text-xl md:text-2xl text-gray-300">تصميم أنيق، أداء احترافي، ولمسة وحدة كافية!</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black text-lg py-6 px-8 rounded-xl font-bold">
              <Link href="#order">
                اطلب الآن
                <ChevronRight className="mr-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-amber-500 text-amber-400 hover:bg-amber-500/10 text-lg py-6 px-8 rounded-xl"
            >
              <Link href="#features">اكتشف المزيد</Link>
            </Button>
          </div>
          <div className="flex justify-center md:justify-start gap-4 pt-4">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
            </div>
            <span className="text-gray-400">أكثر من 1000 تقييم</span>
          </div>
          <div className="text-2xl font-bold mt-4">
            <span className="text-amber-400">179 درهم </span>
            <span className="text-gray-400 line-through text-lg mr-2">240 درهم</span>
          </div>
        </div>
      </div>
    </section>
  )
}

