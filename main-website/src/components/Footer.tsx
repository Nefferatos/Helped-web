const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="font-display text-lg font-bold mb-3">MaidAgency</h4>
            <p className="font-body text-sm opacity-70">Matching trusted domestic professionals with families since 2009.</p>
          </div>
          <div>
            <h5 className="font-body text-sm font-semibold mb-3 uppercase tracking-wider">Company</h5>
            <ul className="space-y-2 font-body text-sm opacity-70">
              <li><a href="#" className="hover:opacity-100 transition-opacity">About Us</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Our Services</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Careers</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-body text-sm font-semibold mb-3 uppercase tracking-wider">Legal</h5>
            <ul className="space-y-2 font-body text-sm opacity-70">
              <li><a href="#" className="hover:opacity-100 transition-opacity">Legal Information</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Privacy Policy</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-body text-sm font-semibold mb-3 uppercase tracking-wider">Join Our Newsletter</h5>
            <p className="font-body text-sm opacity-70 mb-3">Stay updated on care tips, industry news, and agency updates.</p>
            <div className="flex gap-2">
              <input className="flex-1 rounded-lg bg-primary-foreground/10 border border-primary-foreground/20 px-3 py-2 font-body text-sm placeholder:opacity-50" placeholder="Email" />
              <button className="bg-primary text-primary-foreground rounded-lg px-4 py-2 font-body text-sm font-medium hover:opacity-90 transition-opacity">Join</button>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/20 pt-6 font-body text-xs opacity-50 text-center">
          © 2025 MaidAgency. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
