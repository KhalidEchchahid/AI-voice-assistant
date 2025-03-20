import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import Link from "next/link"

export default function ProductShowcase() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            <span className="text-amber-400">آلة حلاقة</span> متعددة الوظائف
          </h2>
          <p className="text-gray-300 mb-8 text-lg">
            تم تصميم ماكينة الحلاقة الذهبية 3 في 1 لتلبية جميع احتياجات العناية الشخصية في جهاز واحد أنيق وعملي.
          </p>
          <ul className="space-y-4">
            <li className="flex items-center gap-3">
              <div className="bg-amber-500/20 w-8 h-8 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-amber-400" />
              </div>
              <span>تحديد دقيق للحية</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="bg-amber-500/20 w-8 h-8 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-amber-400" />
              </div>
              <span>تهذيب الشعر بسهولة</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="bg-amber-500/20 w-8 h-8 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-amber-400" />
              </div>
              <span>إزالة شعر الأنف والمناطق الحساسة بلا ألم</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="bg-amber-500/20 w-8 h-8 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-amber-400" />
              </div>
              <span>تنعيم مثالي للبشرة</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="bg-amber-500/20 w-8 h-8 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-amber-400" />
              </div>
              <span>يمنحك لمسة نهائية نظيفة دون إزعاج</span>
            </li>
          </ul>
          <Button className="mt-8 bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-6 rounded-xl">
            <Link href="#order">اطلب الآن بخصم 30%</Link>
          </Button>
        </div>
        <div className="order-1 md:order-2">
          <Image src="/images/1.png" alt="آلة حلاقة متعددة الوظائف" width={600} height={600} className="mx-auto" />
        </div>
      </div>
    </section>
  )
}

