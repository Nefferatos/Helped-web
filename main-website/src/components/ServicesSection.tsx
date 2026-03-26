import { ArrowRight } from "lucide-react";
import housekeepingImg from "@/assets/housekeeping.jpg";
import elderlyImg from "@/assets/elderly-care.jpg";
import infantImg from "@/assets/infant-care.jpg";
import culinaryImg from "@/assets/culinary.jpg";

const services = [
  {
    title: "Housekeeping",
    description: "Meticulous cleaning, organization, and care to keep your living space immaculate and inviting.",
    image: housekeepingImg,
  },
  {
    title: "Elderly Care",
    description: "Compassionate and professional support for your loved ones. Ensuring dignity and well-being.",
    image: elderlyImg,
  },
  {
    title: "Infant Care",
    description: "Expert caregivers providing nurturing, developmental support for your little ones.",
    image: infantImg,
  },
  {
    title: "Culinary Service",
    description: "Personalized culinary experiences for your dietary preferences and nutrition needs.",
    image: culinaryImg,
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-16 md:py-24 bg-card">
      <div className="container">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Our Core <span className="text-primary">Services</span>
            </h2>
            <p className="font-body text-muted-foreground mt-2">Specialized care designed for modern living standards.</p>
          </div>
          <a href="#" className="hidden md:flex items-center gap-1 font-body text-sm text-primary font-medium hover:underline">
            View All Services <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <div key={service.title} className="group rounded-2xl overflow-hidden bg-muted hover:shadow-lg transition-shadow">
              <div className="h-48 overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  loading="lazy"
                  width={640}
                  height={512}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{service.title}</h3>
                <p className="font-body text-sm text-muted-foreground mb-3">{service.description}</p>
                <a href="#" className="inline-flex items-center gap-1 font-body text-sm text-primary font-medium hover:underline">
                  Learn More <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
