import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import Link from "next/link"

interface CTASectionProps {
  price: string
}

export default function CTASection({ price }: CTASectionProps) {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-3xl p-8 md:p-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              احصل على <span className="text-amber-400">ماكينة الحلاقة الذهبية</span> الآن!
            </h2>
            <p className="text-gray-300 mb-8">
              استمتع بتجربة حلاقة احترافية في منزلك مع ماكينة الحلاقة الذهبية 3 في 1. عرض محدود - خصم 30% + شحن مجاني!
            </p>
            <div className="text-2xl font-bold mb-6">
              <span className="text-amber-400">179 درهم </span>
              <span className="text-gray-400 line-through text-lg mr-2">240 درهم</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-6 rounded-xl">
                <Link href="#order">اطلب الآن</Link>
              </Button>
              <Button variant="outline" className="border-amber-500 text-amber-400 hover:bg-amber-500/10">
                <Link href="#features">معرفة المزيد</Link>
              </Button>
            </div>
            <div className="mt-6 flex gap-6">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-amber-400" />
                <span className="text-sm">ضمان الجودة</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-amber-400" />
                <span className="text-sm">شحن مجاني</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-amber-400" />
                <span className="text-sm">الدفع عند الاستلام</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-amber-500/20 rounded-full blur-3xl opacity-30"></div>
            <Image
              src="/images/6.png"
              alt="ماكينة الحلاقة الذهبية 3 في 1"
              width={500}
              height={500}
              className="relative z-10 mx-auto"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

