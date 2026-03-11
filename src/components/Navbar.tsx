import React from 'react';
import { Phone, Calendar, Menu, X, Mic } from 'lucide-react';
import { motion } from 'motion/react';
import { useCall } from '../context/CallContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const { isCalling, startCall, stopCall } = useCall();

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-brand-dark/90 backdrop-blur-xl border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <a 
            href="/" 
            onClick={(e) => { e.preventDefault(); window.location.href = '/'; }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="w-10 h-10 bg-brand-accent flex items-center justify-center font-bold text-xl text-white group-hover:bg-brand-accent-hover transition-colors">
              M
            </div>
            <span className="font-bold text-2xl tracking-tight text-white uppercase group-hover:text-neutral-200 transition-colors">
              The <span className="text-brand-accent">MOT</span> Garage
            </span>
          </a>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#services" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Services</a>
            <a href="#booking" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Book Online</a>
            <a href="#contact" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Contact</a>
            
            <div className="flex items-center gap-4 ml-6 pl-6 border-l border-brand-border">
              <button 
                onClick={isCalling ? stopCall : startCall}
                className={`flex items-center gap-2 text-xs font-mono font-medium transition-colors px-4 py-2 border ${isCalling ? 'bg-brand-accent text-white border-brand-accent' : 'text-neutral-300 hover:text-white bg-brand-gray border-brand-border hover:border-brand-accent'}`}
              >
                {isCalling ? <Mic size={14} className="animate-pulse" /> : <Phone size={14} className="text-brand-accent" />}
                <span>{isCalling ? 'END AI CALL' : '24/7 ASSISTANT AND BOOKING'}</span>
              </button>
              <a 
                href="#booking"
                className="flex items-center gap-2 text-sm font-bold text-white bg-brand-accent hover:bg-brand-accent-hover px-6 py-2 transition-colors"
              >
                <Calendar size={16} />
                <span>Book Now</span>
              </a>
            </div>
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-neutral-400 hover:text-white transition-colors">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-brand-dark border-b border-brand-border px-4 pt-2 pb-6 space-y-4"
        >
          <a href="#services" className="block text-sm font-medium text-neutral-400 hover:text-white" onClick={() => setIsOpen(false)}>Services</a>
          <a href="#booking" className="block text-sm font-medium text-neutral-400 hover:text-white" onClick={() => setIsOpen(false)}>Book Online</a>
          <a href="#contact" className="block text-sm font-medium text-neutral-400 hover:text-white" onClick={() => setIsOpen(false)}>Contact</a>
          
          <div className="pt-6 border-t border-brand-border flex flex-col gap-4">
            <button 
              onClick={() => { setIsOpen(false); isCalling ? stopCall() : startCall(); }}
              className={`flex items-center justify-center gap-2 w-full text-xs font-mono font-medium py-4 border ${isCalling ? 'bg-brand-accent text-white border-brand-accent' : 'text-white border-brand-border bg-brand-gray'}`}
            >
              {isCalling ? <Mic size={16} className="animate-pulse" /> : <Phone size={16} className="text-brand-accent" />}
              <span>{isCalling ? 'END AI CALL' : '24/7 ASSISTANT AND BOOKING'}</span>
            </button>
            <a 
              href="#booking"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 w-full text-sm font-bold text-white bg-brand-accent py-4"
            >
              <Calendar size={16} />
              <span>Book Appointment</span>
            </a>
          </div>
        </motion.div>
      )}
    </nav>
  );
}
