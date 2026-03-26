import { CheckCircle, Users, HeartHandshake } from "lucide-react";
import familyImg from "@/assets/family.jpg";

const features = [
  {
    icon: CheckCircle,
    title: "Vigorously Vetted",
    description: "Our rigorous screening process ensures only the most trustworthy and capable candidates join our network.",
  },
  {
    icon: Users,
    title: "Smart Matching",
    description: "We use refined, advanced matching to find the best helper who perfectly suits your household's unique needs.",
  },
  {
    icon: HeartHandshake,
    title: "Ongoing Support",
    description: "Our dedicated service doesn't end with a hire. We provide continued mediation and after-placement care.",
  },
];

const WhyChooseSection = () => {
  return (
    <section id="why" className="py-16 md:py-24 bg-muted">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="rounded-2xl overflow-hidden">
              <img src={familyImg} alt="Happy family" loading="lazy" width={640} height={640} className="w-full h-[400px] object-cover rounded-2xl" />
            </div>
            <div className="absolute bottom-6 left-6 bg-primary text-primary-foreground rounded-xl px-5 py-4">
              <p className="font-display text-3xl font-bold">15+</p>
              <p className="font-body text-xs">Years of Excellence in Domestic Management</p>
            </div>
          </div>
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
              Why Choose <br /><span className="text-primary">MaidAgency?</span>
            </h2>
            <div className="space-y-6">
              {features.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-1">{f.title}</h3>
                    <p className="font-body text-sm text-muted-foreground">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseSection;
