import HeroSection from "@/components/sections/hero-section";
import FeaturesSection from "@/components/sections/features-section";
import ProductShowcase from "@/components/sections/product-showcase";
import SpecificationsSection from "@/components/sections/specifications-section";
import UsageSection from "@/components/sections/usage-section";
import TestimonialsSection from "@/components/sections/testimonials-section";
import CTASection from "@/components/sections/cta-section";
import VideoSection from "@/components/sections/video-section";
import Navbar from "@/components/Navbar";
import SiteHeader from "@/components/side-header";
import CheckoutForm from "@/components/CheckoutForm";
import WhatsAppButton from "@/components/WhatsAppButton";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <div
      className="flex min-h-screen flex-col bg-gradient-to-b from-gray-900 to-gray-950 text-white"
      dir="rtl"
    >
      <Navbar />
      <SiteHeader />

      <main className="flex-grow">
        <HeroSection price="199 درهم" />
        <CheckoutForm
          selectedColor="gold"
          selectedSize="standard"
          quantity={1}
          price={199}
        />
        <FeaturesSection />
        <ProductShowcase />
        <VideoSection videoId="LVjdPxQxceI" />
        <SpecificationsSection />
        <UsageSection />
        <TestimonialsSection />
        <CTASection price="199 درهم" />
        <CheckoutForm
          selectedColor="gold"
          selectedSize="standard"
          quantity={1}
          price={199}
        />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
