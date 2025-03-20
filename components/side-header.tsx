import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import Link from "next/link"

export default function SiteHeader() {
  return (
    <header className="container mx-auto px-4 py-6 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Star className="h-6 w-6 text-amber-400" fill="currentColor" />
        <span className="text-xl font-bold text-amber-400">الماكينة الذهبية</span>
      </div>
      <nav className="hidden md:flex gap-8">
        <a href="#features" className="hover:text-amber-400 transition-colors">
          المميزات
        </a>
        <a href="#specifications" className="hover:text-amber-400 transition-colors">
          المواصفات
        </a>
        <a href="#testimonials" className="hover:text-amber-400 transition-colors">
          آراء العملاء
        </a>
      </nav>
      <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
        <Link href="#order">اطلب الآن</Link>
      </Button>
    </header>
  )
}

