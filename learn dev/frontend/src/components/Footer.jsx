import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import SupportForm from "./SupportForm.jsx";
import { SUPPORT_ENABLED } from "../config/features.js";

const Footer = () => {
  const { user } = useAuth();

  return (
    <footer className="bg-ink text-white pt-24 pb-12 border-t border-white/5 relative overflow-hidden">
      {/* Decorative Background Element */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-aqua/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <div className="shell relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-12 gap-y-16 mb-20">
          {/* Brand Column */}
          <section className="space-y-8 animate-fade-in lg:col-span-3">
            <Link to="/" className="group flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-aqua flex items-center justify-center text-xl shadow-lg shadow-aqua/20 group-hover:scale-110 transition-transform duration-500">
                🎓
              </div>
              <span className="text-2xl font-black tracking-tighter">
                Learn<span className="text-aqua">Dev</span>
              </span>
            </Link>
            <p className="text-ink-soft text-sm leading-relaxed max-w-xs">
              Building the future of tech education. Join 10k+ developers mastering modern stacks through project-led learning.
            </p>
            <div className="flex gap-4">
              {[
                { icon: "📱", label: "Instagram" },
                { icon: "🐦", label: "Twitter" },
                { icon: "💼", label: "LinkedIn" },
                { icon: "🎬", label: "YouTube" }
              ].map((social, i) => (
                <a 
                  key={i}
                  href="#" 
                  aria-label={social.label}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-aqua hover:scale-110 hover:-translate-y-1 transition-all duration-300 border border-white/5"
                >
                  <span className="text-lg">{social.icon}</span>
                </a>
              ))}
            </div>
          </section>

          {/* Platform Links */}
          <section className="space-y-8 animate-fade-in [animation-delay:100ms] lg:col-span-2">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-aqua/80">Explorer</h5>
            <nav className="flex flex-col gap-5 text-sm font-medium">
              {[
                { to: "/courses", label: "Course Library" },
                { to: "/dashboard", label: "My Learning" },
                { to: "/settings", label: "Account Hub" },
                { to: "#", label: "Scholarships" }
              ].map((link, i) => (
                <Link 
                  key={i}
                  to={link.to} 
                  className="text-ink-soft hover:text-white hover:translate-x-2 transition-all duration-300 flex items-center gap-2 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-aqua scale-0 group-hover:scale-100 transition-transform duration-300" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </section>

          {/* Support & Community */}
          <section className="space-y-8 animate-fade-in [animation-delay:200ms] lg:col-span-2">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-aqua/80">Resources</h5>
            <nav className="flex flex-col gap-5 text-sm font-medium">
              {[
                SUPPORT_ENABLED ? { href: "mailto:support@learndev.local", label: "Direct Support" } : null,
                { href: "#", label: "Knowledge Base" },
                { href: "#", label: "Developer Blog" },
                { href: "#", label: "Open Source" }
              ].filter(Boolean).map((link, i) => (
                <a 
                  key={i}
                  href={link.href} 
                  className="text-ink-soft hover:text-white hover:translate-x-2 transition-all duration-300 flex items-center gap-2 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-aqua scale-0 group-hover:scale-100 transition-transform duration-300" />
                  {link.label}
                </a>
              ))}
            </nav>
          </section>

          {/* Contact Card */}
          <section className="animate-fade-in [animation-delay:300ms] lg:col-span-5">
            <div className="relative h-full">
              <h5 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                Contact Info
                <span className="animate-pulse w-2 h-2 rounded-full bg-aqua" />
              </h5>
              
              {SUPPORT_ENABLED && user ? (
                <div className="space-y-6">
                  <p className="text-sm text-ink-soft leading-relaxed">
                    Our engineering mentors are currently <span className="text-white font-bold">online</span> and ready to assist you.
                  </p>
                  <SupportForm />
                </div>
              ) : SUPPORT_ENABLED ? (
                <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-[2.5rem] p-8 border border-white/10 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700 text-4xl pointer-events-none">⚡</div>
                  <p className="text-sm text-ink-soft leading-relaxed mb-8">
                    Join our developer community to get 24/7 technical support and exclusive learning resources.
                  </p>
                  <Link 
                    className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-aqua text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-aqua/20 hover:bg-aqua-deep hover:-translate-y-1 transition-all duration-300" 
                    to="/login"
                  >
                    Get Started <span className="text-lg">→</span>
                  </Link>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-[2.5rem] p-8 border border-white/10 relative group overflow-hidden">
                  <p className="text-sm text-ink-soft leading-relaxed mb-6">
                    Reach the Learn Dev team for admissions, course access, and account questions.
                  </p>
                  <div className="grid gap-4 text-sm">
                    <a className="text-ink-soft hover:text-white transition-colors" href="mailto:hello@learndev.local">
                      <span className="text-aqua font-bold">Email:</span> hello@learndev.local
                    </a>
                    <a className="text-ink-soft hover:text-white transition-colors" href="tel:+919876543210">
                      <span className="text-aqua font-bold">Phone:</span> +91 98765 43210
                    </a>
                    <p className="text-ink-soft">
                      <span className="text-aqua font-bold">Hours:</span> Mon-Sat, 10:00 AM - 6:00 PM IST
                    </p>
                    <p className="text-ink-soft">
                      <span className="text-aqua font-bold">Location:</span> Online learning team, India
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-ink-soft">
          <div className="flex flex-wrap justify-center gap-10">
            <a href="#" className="hover:text-aqua transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-aqua transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-aqua transition-colors">Refund Policy</a>
          </div>
          <p>© 2026 Learn Dev. All Rights Reserved. Crafted for Developers.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
