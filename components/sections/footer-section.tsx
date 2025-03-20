import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function FooterSection() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-6 w-6 text-amber-400" fill="currentColor" />
              <span className="text-xl font-bold text-amber-400">الماكينة الذهبية</span>
            </div>
            <p className="text-gray-400 mb-6">ماكينة الحلاقة الذهبية 3 في 1 - الحل الأمثل للعناية الشخصية للرجال</p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-amber-500/20 transition-colors"
              >
                <span className="sr-only">فيسبوك</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-amber-500/20 transition-colors"
              >
                <span className="sr-only">انستغرام</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-amber-500/20 transition-colors"
              >
                <span className="sr-only">تويتر</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">روابط سريعة</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                  الصفحة الرئيسية
                </a>
              </li>
              <li>
                <a href="#features" className="text-gray-400 hover:text-amber-400 transition-colors">
                  المميزات
                </a>
              </li>
              <li>
                <a href="#specifications" className="text-gray-400 hover:text-amber-400 transition-colors">
                  المواصفات
                </a>
              </li>
              <li>
                <a href="#testimonials" className="text-gray-400 hover:text-amber-400 transition-colors">
                  آراء العملاء
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">الدعم</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                  الأسئلة الشائعة
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                  سياسة الشحن
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                  سياسة الإرجاع
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                  اتصل بنا
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">اشترك في نشرتنا</h3>
            <p className="text-gray-400 mb-4">احصل على آخر العروض والتحديثات</p>
            <div className="flex">
              <input
                type="email"
                placeholder="بريدك الإلكتروني"
                className="bg-gray-800 text-white rounded-r-none rounded-l-lg px-4 py-2 w-full"
              />
              <Button className="bg-amber-500 hover:bg-amber-600 text-black rounded-l-none rounded-r-lg">اشترك</Button>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} ماكينة الحلاقة الذهبية. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  )
}

