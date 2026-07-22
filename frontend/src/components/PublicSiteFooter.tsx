import { Clock, Facebook, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { FaTiktok } from "react-icons/fa6";
import { Link } from "react-router-dom";

const footerLinks = [
  { label: "Home", to: "/" },
  { label: "Search Maids", to: "/search-maids" },
  { label: "About Us", to: "/about" },
  { label: "Agency", to: "/agency" },
  { label: "Enquiry", to: "/enquiry2" },
  { label: "FAQ", to: "/faq" },
];

const PublicSiteFooter = () => (
  <footer className="psf-footer">
    <style>{`
      .psf-footer{background:#0B1F25;color:#fff;padding:58px 0 0;font-family:'Inter',sans-serif;border-top:4px solid #FCD34D}
      .psf-inner{max-width:1280px;margin:0 auto;padding:0 24px}
      .psf-grid{display:grid;grid-template-columns:1.4fr 1fr 1.2fr 1.2fr .8fr;gap:36px;margin-bottom:44px}
      .psf-brand{font-family:'Playfair Display',Georgia,serif;font-size:18px;margin:0 0 12px}
      .psf-copy{font-size:13px;color:rgba(255,255,255,.68);line-height:1.7;margin:0}
      .psf-heading{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin:0 0 16px;color:#FCD34D}
      .psf-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;font-size:13px;line-height:1.6}
      .psf-link{color:#fff;text-decoration:none;transition:color .15s}
      .psf-link:hover{color:#FCD34D}
      .psf-contact{display:flex;align-items:flex-start;gap:8px}
      .psf-icon{color:#FCD34D;flex:none;margin-top:2px}
      .psf-socials{display:flex;gap:10px}
      .psf-social{width:38px;height:38px;border-radius:9px;border:1.5px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:#fff;text-decoration:none;transition:all .18s}
      .psf-social--facebook{color:#60A5FA}
      .psf-social--facebook:hover{color:#fff;background:#1877F2;border-color:#1877F2;transform:translateY(-2px)}
      .psf-social--tiktok:hover{color:#061D26;background:#FCD34D;border-color:#FCD34D;transform:translateY(-2px)}
      .psf-bottom{border-top:1px solid rgba(255,255,255,.1);padding:20px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .psf-bottom p{font-size:12px;color:rgba(255,255,255,.72);margin:0}
      .psf-legal{display:flex;gap:4px}
      .psf-legal a{font-size:12px;color:rgba(255,255,255,.72);text-decoration:none;padding:0 8px}
      .psf-legal a:hover{color:#FCD34D}
      @media(max-width:900px){.psf-grid{grid-template-columns:1fr 1fr 1fr;gap:30px}}
      @media(max-width:600px){.psf-footer{padding-top:44px}.psf-grid{grid-template-columns:1fr 1fr;gap:28px 20px}.psf-grid>div:first-child{grid-column:1/-1}.psf-bottom{align-items:flex-start;flex-direction:column}}
      @media(max-width:420px){.psf-grid{grid-template-columns:1fr}}
    `}</style>
    <div className="psf-inner">
      <div className="psf-grid">
        <div>
          <h4 className="psf-brand">&quot;Find Maids&quot; At The Agency</h4>
          <p className="psf-copy">Matching trusted domestic professionals with Singapore families since 2009.</p>
        </div>
        <div>
          <h5 className="psf-heading">Quick Links</h5>
          <ul className="psf-list">
            {footerLinks.map((item) => <li key={item.to}><Link className="psf-link" to={item.to}>{item.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h5 className="psf-heading">Contact Us</h5>
          <ul className="psf-list">
            <li className="psf-contact"><MapPin className="psf-icon" size={16}/><span>3 Jalan Kukoh, #01-115<br/>Singapore 161003</span></li>
            <li className="psf-contact"><Mail className="psf-icon" size={16}/><a className="psf-link" href="mailto:enquiries.j1@gmail.com">enquiries.j1@gmail.com</a></li>
            <li className="psf-contact"><Phone className="psf-icon" size={16}/><a className="psf-link" href="tel:+6580730757">8073 0757</a></li>
          </ul>
        </div>
        <div>
          <h5 className="psf-heading">Opening Hours</h5>
          <ul className="psf-list">
            <li className="psf-contact"><Clock className="psf-icon" size={16}/><span>Mon to Sun: 11:00am to 11:00pm</span></li>
            <li className="psf-contact"><MessageCircle className="psf-icon" size={16}/><span>Other hours by mobile. Please SMS if urgent.</span></li>
          </ul>
        </div>
        <div>
          <h5 className="psf-heading">Follow Us</h5>
          <div className="psf-socials">
            <a href="#" className="psf-social psf-social--facebook" aria-label="Follow us on Facebook"><Facebook size={18}/></a>
            <a href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer" className="psf-social psf-social--tiktok" aria-label="Follow us on TikTok"><FaTiktok size={17}/></a>
          </div>
        </div>
      </div>
      <div className="psf-bottom">
        <p>© 2026 &quot;Find Maids&quot; At The Agency. All rights reserved.</p>
        <div className="psf-legal"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/contact">Contact</Link></div>
      </div>
    </div>
  </footer>
);

export default PublicSiteFooter;
