import Image from "next/image";

export default function SpecificationsSection() {
  return (
    <section id="specifications" className="bg-gray-800/30 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-amber-400">مواصفات</span> تقنية متطورة
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            صُممت ماكينة الحلاقة الذهبية بأحدث التقنيات لضمان أداء متميز وعمر
            تشغيلي طويل
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <Image
            src="/images/5.png"
            alt="مواصفات تقنية متطورة"
            width={600}
            height={600}
            className="mx-auto rounded-xl"
          />
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="bg-amber-500/20 w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center">
                <span className="text-amber-400 font-bold">01</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">أسنان حادة</h3>
                <p className="text-gray-400">
                  شفرات حادة مصنوعة من الفولاذ المقاوم للصدأ تضمن حلاقة دقيقة
                  وناعمة
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-amber-500/20 w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center">
                <span className="text-amber-400 font-bold">02</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">تصميم جسم معدني</h3>
                <p className="text-gray-400">
                  هيكل معدني أنيق مقاوم للصدمات يضمن متانة الجهاز وعمراً طويلاً
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-amber-500/20 w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center">
                <span className="text-amber-400 font-bold">03</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">محرك قوي</h3>
                <p className="text-gray-400">
                  محرك عالي الأداء يوفر قوة ثابتة للحلاقة بدون تعثر حتى مع الشعر
                  الكثيف
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-amber-500/20 w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center">
                <span className="text-amber-400 font-bold">04</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">شحن Type C</h3>
                <p className="text-gray-400">
                  بطارية قابلة للشحن مع منفذ Type C سريع يوفر ساعات طويلة من
                  الاستخدام
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
