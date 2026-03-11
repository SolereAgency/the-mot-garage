import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Wrench, ShieldCheck, Clock, Mic, Phone } from 'lucide-react';
import { useCall } from '../context/CallContext';

export default function Hero() {
  const { isCalling, startCall, stopCall } = useCall();
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://picsum.photos/seed/mechanic/1920/1080?blur=2" 
          alt="Mechanic working on car" 
          className="w-full h-full object-cover opacity-20 grayscale"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/95 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand-dark/95 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-xs font-mono font-medium mb-8">
              <span className="w-1.5 h-1.5 bg-brand-accent animate-pulse" />
              NAILSWORTH'S PREMIER AUTO CENTER
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-8 tracking-tight">
              Expert Care For Your <span className="text-brand-accent">Vehicle.</span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 mb-12 max-w-2xl leading-relaxed">
              From MOTs to complex diagnostics, our Bosch Auto Specialists deliver state-of-the-art service with unmatched precision. Book online or talk to our AI assistant.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="#booking"
                className="inline-flex items-center justify-center gap-3 bg-brand-accent hover:bg-brand-accent-hover text-white px-8 py-4 font-bold transition-all hover:-translate-y-0.5"
              >
                Book Appointment <ArrowRight size={18} />
              </a>
              <button 
                onClick={isCalling ? stopCall : startCall}
                className={`inline-flex items-center justify-center gap-3 px-8 py-4 font-mono text-sm transition-all hover:-translate-y-0.5 border ${isCalling ? 'bg-white text-brand-accent border-white' : 'bg-brand-gray border-brand-border hover:border-brand-accent text-white'}`}
              >
                {isCalling ? (
                  <>
                    <Mic size={18} className="animate-pulse" /> END AI CALL
                  </>
                ) : (
                  <>
                    <Phone size={18} className="text-brand-accent" /> 24/7 ASSISTANT AND BOOKING
                  </>
                )}
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-24 pt-12 border-t border-brand-border"
          >
            <div className="flex items-start gap-4 group">
              <div className="w-12 h-12 bg-brand-gray border border-brand-border flex items-center justify-center text-brand-accent shrink-0 transition-colors duration-300 group-hover:bg-brand-accent group-hover:text-white">
                <div className="transform transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12">
                  <ShieldCheck size={20} />
                </div>
              </div>
              <div>
                <h3 className="text-white font-bold mb-1 group-hover:text-brand-accent transition-colors">Bosch Auto Specialists</h3>
                <p className="text-xs font-mono text-neutral-500">CERTIFIED EXPERTS</p>
              </div>
            </div>
            <div className="flex items-start gap-4 group">
              <div className="w-12 h-12 bg-brand-gray border border-brand-border flex items-center justify-center text-brand-accent shrink-0 transition-colors duration-300 group-hover:bg-brand-accent group-hover:text-white">
                <div className="transform transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12">
                  <Wrench size={20} />
                </div>
              </div>
              <div>
                <h3 className="text-white font-bold mb-1 group-hover:text-brand-accent transition-colors">All Makes & Models</h3>
                <p className="text-xs font-mono text-neutral-500">COMPREHENSIVE CARE</p>
              </div>
            </div>
            <div className="flex items-start gap-4 group">
              <div className="w-12 h-12 bg-brand-gray border border-brand-border flex items-center justify-center text-brand-accent shrink-0 transition-colors duration-300 group-hover:bg-brand-accent group-hover:text-white">
                <div className="transform transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12">
                  <Clock size={20} />
                </div>
              </div>
              <div>
                <h3 className="text-white font-bold mb-1 group-hover:text-brand-accent transition-colors">Fast Turnaround</h3>
                <p className="text-xs font-mono text-neutral-500">GET BACK ON THE ROAD</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
