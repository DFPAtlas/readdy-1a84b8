import { Link } from 'react-router-dom';

const currentYear = new Date().getFullYear();

const footerLinks = {
  product: [
    { label: 'Features', href: '/features' },
    { label: 'Guest Experience', href: '/guest-experience' },
    { label: 'Travel Concierge', href: '/travel-concierge' },
    { label: 'Pricing', href: '/pricing' },
  ],
  company: [
    { label: 'About Vowora', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cookie Notice', href: '/cookies' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Content Rules', href: '/content-rules' },
    { label: 'Subprocessors', href: '/subprocessors' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-background-100 border-t border-secondary-100" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="font-heading text-2xl font-semibold text-foreground-900 cursor-pointer">
              Vowora
            </Link>
            <p className="mt-3 text-sm text-foreground-600 leading-relaxed">
              Plan your wedding, manage every guest and keep everyone updated from one beautiful place.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-label text-xs tracking-widest uppercase text-foreground-500 mb-4">
              <Link to="/features" className="hover:text-foreground-700 transition-colors cursor-pointer">Product</Link>
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-foreground-600 hover:text-foreground-900 transition-colors cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="font-label text-xs tracking-widest uppercase text-foreground-500 mb-4">
              <Link to="/about" className="hover:text-foreground-700 transition-colors cursor-pointer">Company</Link>
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-foreground-600 hover:text-foreground-900 transition-colors cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="font-label text-xs tracking-widest uppercase text-foreground-500 mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-foreground-600 hover:text-foreground-900 transition-colors cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-secondary-100 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-foreground-500">
            &copy; {currentYear} Vowora. All rights reserved.
          </p>
          <p className="text-xs text-foreground-400">
            Your wedding, beautifully organised.
          </p>
        </div>
      </div>
    </footer>
  );
}