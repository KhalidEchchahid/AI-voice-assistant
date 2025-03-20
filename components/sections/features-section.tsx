import { Check } from "lucide-react"

export default function FeaturesSection() {
  return (
    <section id="features" className="container mx-auto px-4 py-16 md:py-24">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="text-amber-400">مميزات</span> فريدة في جهاز واحد
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          ماكينة الحلاقة الذهبية 3 في 1 تجمع بين الدقة والأناقة والأداء الاحترافي لتمنحك تجربة حلاقة مثالية
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-gray-800/50 p-6 rounded-2xl hover:bg-gray-800 transition-colors">
          <div className="bg-amber-500/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
            <Check className="h-6 w-6 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">تحديد دقيق للحية</h3>
          <p className="text-gray-400">شفرات حادة من الفولاذ المقاوم للصدأ تضمن تحديداً دقيقاً للحية بمختلف الأطوال</p>
        </div>
        <div className="bg-gray-800/50 p-6 rounded-2xl hover:bg-gray-800 transition-colors">
          <div className="bg-amber-500/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
            <Check className="h-6 w-6 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">تهذيب الشعر بسهولة</h3>
          <p className="text-gray-400">رؤوس متعددة وأمشاط بأطوال مختلفة لتهذيب شعر الرأس بالطول المناسب لك</p>
        </div>
        <div className="bg-gray-800/50 p-6 rounded-2xl hover:bg-gray-800 transition-colors">
          <div className="bg-amber-500/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
            <Check className="h-6 w-6 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">إزالة شعر الأنف</h3>
          <p className="text-gray-400">رأس مخصص لإزالة شعر الأنف والمناطق الحساسة بدون ألم أو إزعاج</p>
        </div>
        <div className="bg-gray-800/50 p-6 rounded-2xl hover:bg-gray-800 transition-colors">
          <div className="bg-amber-500/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
            <Check className="h-6 w-6 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">تنعيم مثالي للبشرة</h3>
          <p className="text-gray-400">تصميم مريح يضمن تنعيماً مثالياً للبشرة ويمنحك لمسة نهائية نظيفة دون إزعاج</p>
        </div>
      </div>
    </section>
  )
}

