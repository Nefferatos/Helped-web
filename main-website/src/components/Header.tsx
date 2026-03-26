import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="font-display text-xl font-bold text-foreground">
          MaidAgency
        </Link>
        <nav className="hidden md:flex items-center gap-8 font-body text-sm font-medium">
          <a href="#services" className="text-foreground hover:text-primary transition-colors">Services</a>
          <a href="#search" className="text-foreground hover:text-primary transition-colors">Search Maids</a>
          <a href="#why" className="text-foreground hover:text-primary transition-colors">About</a>
          <a href="#contact" className="text-foreground hover:text-primary transition-colors">Contact</a>
        </nav>
        <Link to="/employer-login">
          <Button variant="default" size="sm" className="font-body">
            Employer Login
          </Button>
        </Link>
      </div>
    </header>
  );
};

export default Header;
