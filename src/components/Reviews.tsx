import React from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';

const reviews = [
  {
    name: "James T.",
    text: "Excellent service from the team. Booked my MOT online, dropped the car off, and it was done exactly when they said it would be. Very professional.",
  },
  {
    name: "Sarah M.",
    text: "The Bosch Auto Specialists here really know their stuff. Diagnosed an engine issue that two other garages couldn't figure out. Highly recommend!",
  },
  {
    name: "David R.",
    text: "Honest, reliable, and well-priced. They don't try to upsell you on things you don't need. The new AI booking system is also a breeze to use.",
  },
  {
    name: "Emma L.",
    text: "Fantastic garage. I've been bringing my cars here for years. Always a friendly welcome and top-quality work. 5 stars all the way.",
  },
  {
    name: "Mark W.",
    text: "Quick turnaround on a full service and MOT. The communication was great throughout the day. Will definitely be returning next year.",
  }
];

export default function Reviews() {
  return (
    <section className="py-24 bg-brand-dark border-t border-brand-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
        <h2 className="text-brand-accent font-mono text-xs mb-4">CUSTOMER FEEDBACK</h2>
        <h3 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Trusted by Nailsworth</h3>
      </div>

      <div className="relative flex overflow-x-hidden group">
        <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-brand-dark to-transparent z-10" />
        <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-brand-dark to-transparent z-10" />
        
        <motion.div 
          className="flex gap-6 py-4 px-6"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: 30,
            ease: "linear",
            repeat: Infinity,
          }}
        >
          {/* Double the array for seamless infinite scroll */}
          {[...reviews, ...reviews].map((review, idx) => (
            <div 
              key={idx} 
              className="w-[350px] shrink-0 bg-brand-gray border border-brand-border p-8 hover:border-brand-accent transition-colors"
            >
              <div className="flex gap-1 mb-6 text-brand-accent">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>
              <p className="text-neutral-300 mb-8 leading-relaxed text-sm">"{review.text}"</p>
              <div className="flex items-center gap-4 border-t border-brand-border pt-6">
                <div className="w-10 h-10 bg-brand-dark flex items-center justify-center font-bold text-white border border-brand-border">
                  {review.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{review.name}</p>
                  <p className="text-xs font-mono text-neutral-500">Verified Customer</p>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
