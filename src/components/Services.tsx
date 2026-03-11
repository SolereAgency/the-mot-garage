import React from 'react';
import { motion } from 'motion/react';
import { Settings, Car, Wrench, Battery, Disc, Zap, Activity, CheckCircle, Cog } from 'lucide-react';

const services = [
  { icon: <Activity size={24} />, title: "MOTs", desc: "Comprehensive testing to ensure your vehicle meets road safety and environmental standards." },
  { icon: <Settings size={24} />, title: "Full Car Service", desc: "Comprehensive full vehicle service to ensure peak performance and longevity." },
  { icon: <CheckCircle size={24} />, title: "Deep Car Service", desc: "Spark plugs change, Oil Change, and full service for ultimate vehicle care." },
  { icon: <Disc size={24} />, title: "Tyres", desc: "Premium and budget tyre fitting, balancing, and alignment for optimal grip and safety." },
  { icon: <Wrench size={24} />, title: "Exhausts", desc: "Inspection, repair, and replacement of exhaust systems to maintain performance and emissions." },
  { icon: <Car size={24} />, title: "Brakes", desc: "Expert brake pad, disc, and fluid replacement to guarantee stopping power." },
  { icon: <Zap size={24} />, title: "Electronics", desc: "Advanced diagnostics and repair for all vehicle electronic systems and sensors." },
  { icon: <Cog size={24} />, title: "Clutches", desc: "Professional clutch repair and replacement for smooth gear transitions." },
];

export default function Services() {
  return (
    <section id="services" className="py-32 bg-brand-dark relative border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-brand-accent font-mono text-xs mb-4">OUR EXPERTISE</h2>
          <h3 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">Bosch Auto Specialists</h3>
          <p className="text-neutral-400 text-lg leading-relaxed">
            In addition to car repairs and servicing, we are Bosch Auto Specialists equipped with state-of-the-art diagnostics. We provide excellent quality services and parts to clients throughout Nailsworth and a 10-mile radius.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
              className="bg-brand-gray border border-brand-border p-6 hover:border-brand-accent transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-brand-dark border border-brand-border flex items-center justify-center text-brand-accent mb-6 group-hover:bg-brand-accent group-hover:text-white transition-all duration-300">
                <div className="transform transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12">
                  {service.icon}
                </div>
              </div>
              <h4 className="text-lg font-bold text-white mb-3">{service.title}</h4>
              <p className="text-neutral-400 text-sm leading-relaxed">
                {service.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
