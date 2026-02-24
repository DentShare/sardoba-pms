import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { DashboardPreview } from '@/components/DashboardPreview';
import { Stats } from '@/components/Stats';
import { Pricing } from '@/components/Pricing';
import { Testimonials } from '@/components/Testimonials';
import { CTA } from '@/components/CTA';
import { Footer } from '@/components/Footer';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <DashboardPreview />
        <Stats />
        <Pricing />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
