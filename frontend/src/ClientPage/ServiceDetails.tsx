import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Phone } from "lucide-react";
import culinaryImg from "./assets/culinary.png";
import elderlyImg from "./assets/elderly-care.png";
import housekeepingImg from "./assets/housekeeping.png";
import infantImg from "./assets/infant-care.png";

const serviceData: Record<string, {
  title: string;
  tagline: string;
  image: string;
  description: string;
  details: string[];
  benefits: string[];
}> = {
  housekeeping: {
    title: "Housekeeping",
    tagline: "A spotless home, every single day.",
    image: housekeepingImg,
    description:
      "Our trained housekeeping professionals ensure your home remains immaculate, organized, and welcoming. From daily cleaning routines to deep-cleaning sessions, our helpers are skilled in maintaining the highest standards of hygiene and orderliness. Sourced primarily from the North East regions of India, our helpers bring dedication, discipline, and a warm demeanor to every household they serve.",
    details: [
      "Daily sweeping, mopping, and dusting of all rooms",
      "Kitchen cleaning, dishwashing, and pantry organization",
      "Bathroom and toilet sanitization",
      "Laundry, ironing, and wardrobe management",
      "Deep cleaning of appliances, windows, and fixtures",
      "Grocery and household supply management",
    ],
    benefits: [
      "Well-trained and verified professionals",
      "Flexible full-time or part-time arrangements",
      "Helpers experienced with Indian and international households",
      "Replacement guarantee if helper is unsuitable",
    ],
  },
  "elderly-care": {
    title: "Elderly Care",
    tagline: "Compassionate care for your loved ones.",
    image: elderlyImg,
    description:
      "We provide compassionate, professional elderly care services that prioritize the dignity, comfort, and well-being of senior family members. Our caregivers are trained to handle the unique needs of elderly individuals, from daily assistance to companionship, ensuring they feel safe and cared for in the comfort of their own home.",
    details: [
      "Assistance with daily activities — bathing, dressing, mobility",
      "Medication reminders and health monitoring",
      "Meal preparation tailored to dietary requirements",
      "Companionship and emotional support",
      "Light physiotherapy exercises and walking assistance",
      "Coordination with doctors and family for health updates",
    ],
    benefits: [
      "Caregivers trained in elderly and palliative care",
      "24/7 live-in or scheduled visit options",
      "Patient, empathetic, and culturally sensitive helpers",
      "Regular progress updates to family members",
    ],
  },
  "infant-care": {
    title: "Infant Care",
    tagline: "Nurturing your little ones with expert hands.",
    image: infantImg,
    description:
      "Our infant care specialists provide attentive, nurturing support for babies and toddlers. From newborn care to developmental play, our trained nannies ensure your child receives the best possible start in life. Every caregiver is carefully vetted and trained in child safety, nutrition, and early childhood development.",
    details: [
      "Newborn care — feeding, diaper changes, sleep routines",
      "Age-appropriate developmental activities and play",
      "Baby food preparation and nutrition management",
      "Bathing, grooming, and hygiene maintenance",
      "Night-time care and sleep training support",
      "Safety monitoring and childproofing guidance",
    ],
    benefits: [
      "Experienced nannies with infant care certifications",
      "Trained in first aid and emergency response",
      "Warm, patient, and loving caregivers",
      "Flexible live-in or daytime arrangements",
    ],
  },
  "kid-care": {
    title: "Kid Care",
    tagline: "Safe, fun, and nurturing care for your growing children.",
    image: culinaryImg,
    description:
      "Our kid care professionals provide a safe, stimulating, and nurturing environment for children of all ages. From after-school supervision to full-day care, our trained caregivers focus on your child's physical, emotional, and intellectual development while giving parents peace of mind.",
    details: [
      "After-school supervision and homework assistance",
      "Age-appropriate educational activities and creative play",
      "Outdoor activities and physical exercise routines",
      "Healthy meal and snack preparation for children",
      "School drop-off and pick-up coordination",
      "Screen time management and routine building",
    ],
    benefits: [
      "Caregivers trained in child development and safety",
      "First aid and emergency response certified",
      "Patient, energetic, and engaging professionals",
      "Flexible scheduling — part-time or full-time",
    ],
  },
};

const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const service = slug ? serviceData[slug] : null;

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-24 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">Service Not Found</h1>
          <p className="font-body text-muted-foreground mb-6">The service you're looking for doesn't exist.</p>
          <Link to="/" className="font-body text-primary hover:underline inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <section className="relative h-64 md:h-80 overflow-hidden">
        <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-foreground/60" />
        <div className="absolute inset-0 flex items-center">
          <div className="container">
            <Link to="/#services" className="font-body text-primary-foreground/80 hover:text-primary-foreground text-sm inline-flex items-center gap-1 mb-3">
              <ArrowLeft className="w-4 h-4" /> Back to Services
            </Link>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground">{service.title}</h1>
            <p className="font-body text-primary-foreground/90 text-lg mt-2">{service.tagline}</p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-10">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">About This Service</h2>
                <p className="font-body text-muted-foreground leading-relaxed">{service.description}</p>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">What's Included</h2>
                <ul className="space-y-3">
                  {service.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="font-body text-muted-foreground">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-4">Why Choose Us</h2>
                <ul className="space-y-3">
                  {service.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary mt-0.5 shrink-0" />
                      <span className="font-body text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-display text-lg font-semibold text-foreground mb-3">Interested in this service?</h3>
                <p className="font-body text-sm text-muted-foreground mb-5">
                  Get in touch with us to discuss your requirements and find the perfect helper for your home.
                </p>
                <Link
                  to="/enquiry2"
                  className="block w-full text-center bg-primary text-primary-foreground font-body font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors mb-3"
                >
                  Submit an Enquiry
                </Link>
                <Link
                  to="/contact"
                  className="block w-full text-center border border-primary text-primary font-body font-medium py-3 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  <Phone className="w-4 h-4 inline mr-2" />
                  Contact Us
                </Link>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-display text-lg font-semibold text-foreground mb-3">Other Services</h3>
                <ul className="space-y-2">
                  {Object.entries(serviceData)
                    .filter(([key]) => key !== slug)
                    .map(([key, s]) => (
                      <li key={key}>
                        <Link
                          to={`/services/${key}`}
                          className="font-body text-sm text-primary hover:underline"
                        >
                          {s.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServiceDetail;