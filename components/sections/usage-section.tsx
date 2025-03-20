import Image from "next/image"

export default function UsageSection() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="text-amber-400">استخدامات</span> متعددة لكل احتياجاتك
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          ماكينة الحلاقة الذهبية 3 في 1 مصممة لتلبية جميع احتياجات العناية الشخصية للرجال
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-gray-800/50 rounded-2xl overflow-hidden hover:bg-gray-800 transition-colors">
          <div className="h-64 relative">
            <Image src="/images/3.png" alt="تحديد الذقن والحلاقة" fill className="object-cover" />
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold mb-2">تحديد الذقن والحلاقة</h3>
            <p className="text-gray-400">حدد ذقنك بدقة متناهية وأضف لمسة من الأناقة لمظهرك مع رأس الحلاقة الدقيق</p>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-2xl overflow-hidden hover:bg-gray-800 transition-colors">
          <div className="h-64 relative">
            <Image src="/images/4.png" alt="تهذيب الشعر" fill className="object-cover" />
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold mb-2">تهذيب الشعر</h3>
            <p className="text-gray-400">
              احصل على قصة شعر احترافية في المنزل مع رؤوس التهذيب المتعددة والأمشاط بأطوال مختلفة
            </p>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-2xl overflow-hidden hover:bg-gray-800 transition-colors">
          <div className="h-64 relative">
            <Image src="/images/2.png" alt="إزالة شعر الأنف والمناطق الحساسة" fill className="object-cover" />
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold mb-2">إزالة شعر الأنف والمناطق الحساسة</h3>
            <p className="text-gray-400">
              تخلص من الشعر غير المرغوب فيه بسهولة وأمان مع رأس الحلاقة المخصص للمناطق الحساسة
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

