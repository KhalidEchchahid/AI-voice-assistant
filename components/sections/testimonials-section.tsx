import { Star } from "lucide-react"

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-gray-800/30 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-amber-400">آراء</span> عملائنا
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            اكتشف ما يقوله عملاؤنا عن تجربتهم مع ماكينة الحلاقة الذهبية 3 في 1
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 p-6 rounded-2xl">
            <div className="flex mb-4">
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
            </div>
            <p className="text-gray-300 mb-4">
              "أفضل ماكينة حلاقة استخدمتها على الإطلاق! التصميم أنيق جداً والأداء ممتاز. أنصح بها بشدة لكل رجل يبحث عن
              الدقة والجودة."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <span className="text-amber-400 font-bold">أ</span>
              </div>
              <div>
                <p className="font-bold">أحمد محمد</p>
                <p className="text-gray-400 text-sm">عميل مؤكد</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 p-6 rounded-2xl">
            <div className="flex mb-4">
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
            </div>
            <p className="text-gray-300 mb-4">
              "جهاز رائع بكل المقاييس! يوفر الوقت والجهد بفضل تعدد استخداماته. البطارية تدوم لفترة طويلة والشحن سريع
              جداً."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <span className="text-amber-400 font-bold">خ</span>
              </div>
              <div>
                <p className="font-bold">خالد العبدالله</p>
                <p className="text-gray-400 text-sm">عميل مؤكد</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 p-6 rounded-2xl">
            <div className="flex mb-4">
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
              <Star className="h-5 w-5 text-amber-400" fill="currentColor" />
            </div>
            <p className="text-gray-300 mb-4">
              "اشتريتها كهدية لزوجي وهو سعيد جداً بها! التصميم فخم والجودة ممتازة. الآن أصبح يهتم بمظهره بشكل أفضل بفضل
              سهولة استخدامها."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <span className="text-amber-400 font-bold">س</span>
              </div>
              <div>
                <p className="font-bold">سارة الأحمد</p>
                <p className="text-gray-400 text-sm">عميلة مؤكدة</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

