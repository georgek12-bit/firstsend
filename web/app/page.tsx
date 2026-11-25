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
import Why from '@/components/Why';

export default function Home() {
  return (
    <div className="page">
      <Nav />
      <main>
        <Hero />
        <TrustedBy />
        <HowItWorks />
        <Stats />
        <Why />
        <LaunchKit />
        <Guarantee />
        <Volume />
        <Marquee />
        <Faq />
      </main>
      <FinalCta />
      <Motion />
    </div>
  );
}
