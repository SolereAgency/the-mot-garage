import React from 'react';
import { Facebook, Instagram, MapPin, Phone, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer id="contact" className="bg-brand-dark border-t border-white/5 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 border border-brand-accent rounded-full flex items-center justify-center font-display font-bold text-xl text-brand-accent">
                M
              </div>
              <span className="font-display font-bold text-2xl tracking-wide text-white uppercase">
                The <span className="text-brand-accent">MOT</span> Garage
              </span>
            </div>
            <p className="text-neutral-400 max-w-md leading-relaxed mb-10 font-light">
              Nailsworth's premier MOT and auto repair center. Bosch Auto Specialists providing state-of-the-art diagnostics and exceptional service.
            </p>
            <div className="flex gap-4">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-neutral-400 hover:text-brand-accent hover:border-brand-accent transition-all">
                <Facebook size={18} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-neutral-400 hover:text-brand-accent hover:border-brand-accent transition-all">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-display text-lg mb-8 tracking-wide">Contact Us</h4>
            <ul className="space-y-5">
              <li className="flex items-start gap-4 text-neutral-400 font-light group">
                <Phone size={18} className="text-brand-accent shrink-0 mt-1 group-hover:animate-pulse" />
                <a href="tel:01453834500" className="hover:text-white transition-colors">01453 834500</a>
              </li>
              <li className="flex items-start gap-4 text-neutral-400 font-light group">
                <Mail size={18} className="text-brand-accent shrink-0 mt-1 group-hover:animate-pulse" />
                <a href="mailto:info@themotgarage.co.uk" className="hover:text-white transition-colors">info@themotgarage.co.uk</a>
              </li>
              <li className="flex items-start gap-4 text-neutral-400 font-light group">
                <MapPin size={18} className="text-brand-accent shrink-0 mt-1 group-hover:animate-bounce" />
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=Days+Mill,+Old+Market,+Nailsworth,+GL6+0DU" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="leading-relaxed hover:text-white transition-colors block"
                >
                  Prop. Michael Drew.<br />
                  Days Mill<br />
                  Old Market<br />
                  Nailsworth<br />
                  Gloucestershire<br />
                  GL6 0DU
                  <span className="block mt-2 text-xs font-mono text-brand-accent group-hover:underline">OPEN IN MAPS →</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-display text-lg mb-8 tracking-wide">Opening Hours</h4>
            <ul className="space-y-4 text-neutral-400 font-light">
              <li className="flex justify-between items-center border-b border-white/5 pb-4">
                <span>Mon - Fri</span>
                <span className="text-white font-medium text-sm tracking-widest">09:00 - 17:00</span>
              </li>
              <li className="flex justify-between items-center border-b border-white/5 pb-4">
                <span>Saturday</span>
                <span className="text-brand-accent font-medium text-sm tracking-widest uppercase">Closed</span>
              </li>
              <li className="flex justify-between items-center pb-4">
                <span>Sunday</span>
                <span className="text-brand-accent font-medium text-sm tracking-widest uppercase">Closed</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-display text-lg mb-8 tracking-wide">Service Areas</h4>
            <p className="text-neutral-400 font-light text-sm leading-relaxed">
              Providing expert MOT, car repairs, and mechanic services across:
              <span className="block mt-2 text-brand-accent">
                Nailsworth • Stroud • Stonehouse • Wotton-under-Edge • Berkeley • Dursley • Minchinhampton • Painswick
              </span>
            </p>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-neutral-500 text-xs tracking-widest uppercase">
            &copy; {new Date().getFullYear()} The MOT Garage. All Rights Reserved.
          </p>
          <div className="flex gap-8 text-xs tracking-widest uppercase text-neutral-500">
            <a href="#" className="hover:text-brand-accent transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-brand-accent transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
