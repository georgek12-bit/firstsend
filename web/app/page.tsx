import Faq from '@/components/Faq';
import FinalCta from '@/components/FinalCta';
import Guarantee from '@/components/Guarantee';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import LaunchKit from '@/components/LaunchKit';
import Marquee from '@/components/Marquee';
import Motion from '@/components/Motion';
import Nav from '@/components/Nav';
import Stats from '@/components/Stats';
import TrustedBy from '@/components/TrustedBy';
import Volume from '@/components/Volume';

export default function Home() {
  return (
    <div className="page">
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <TrustedBy />
        <Volume />
        <HowItWorks />
        <LaunchKit />
        <Guarantee />
        <Stats />
        <Faq />
      </main>
      <FinalCta />
      <Motion />
    </div>
  );
}
