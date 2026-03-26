import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import heroImage from "@/assets/hero-maid.jpg";

const HeroSection = () => {
  return (
    <section className="bg-card">
      <div className="container py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block bg-secondary/20 text-secondary font-body text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              Expert Domestic Care
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Exceptional{" "}
              <span className="text-primary italic">Support</span> For Every Home.
            </h1>
            <p className="font-body text-muted-foreground text-base md:text-lg mb-8 max-w-lg">
              Discover professional help tailored to your family's unique needs. From housekeeping to specialized infant care, we provide vetted experts you can trust.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="font-body">Through Agency</Button>
              <Button variant="outline" size="lg" className="font-body">Direct Hire</Button>
              <Button variant="outline" size="lg" className="font-body">Bio Data Direct Sell</Button>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-xl">
              <img src={heroImage} alt="Professional domestic helper" width={640} height={800} className="w-full h-[400px] md:h-[500px] object-cover" />
            </div>
            <div className="absolute bottom-6 left-6 bg-card rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-body text-sm font-semibold text-foreground">Vetted Professionals</p>
                <p className="font-body text-xs text-muted-foreground">Background checked & verified</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
