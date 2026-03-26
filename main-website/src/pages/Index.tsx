import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SearchBar from "@/components/SearchBar";
import ServicesSection from "@/components/ServicesSection";
import WhyChooseSection from "@/components/WhyChooseSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <SearchBar />
      <ServicesSection />
      <WhyChooseSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
