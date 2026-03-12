import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, isSameDay, setHours, setMinutes, startOfToday, addMinutes } from 'date-fns';
import { Calendar as CalendarIcon, Clock, CheckCircle2, Mail, Facebook, ChevronRight, ArrowLeft } from 'lucide-react';

const bookingServices = [
  { id: 'mot', name: 'MOT TEST', duration: 45, noShowFee: 30 },
  { id: 'inspection', name: 'INSPECTION SERVICE (plus Parts)', duration: 120, noShowFee: 30 },
  { id: 'full-service', name: 'FULL CAR SERVICE', duration: 120, noShowFee: 30 },
  { id: 'deep-service', name: 'DEEP CAR SERVICE (Spark plugs, Oil, Full Service)', duration: 180, noShowFee: 30 },
  { id: 'oil', name: 'OIL SERVICE (plus Parts)', duration: 90, noShowFee: 30 },
  { id: 'repairs', name: 'GENERAL REPAIRS', duration: 60, noShowFee: 30 },
  { id: 'ac', name: 'AIR CONDITIONING', duration: 45, noShowFee: 30 },
  { id: 'assessment', name: 'Assessment', duration: 10, noShowFee: 30 },
];

export default function Booking() {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<typeof bookingServices[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', reg: '', carMake: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingReg, setIsFetchingReg] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [isStripeSuccess, setIsStripeSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastBookingName, setLastBookingName] = useState('');

  // Listen for storage events and visibility changes to sync success across tabs
  React.useEffect(() => {
    const checkSync = () => {
      if (localStorage.getItem('booking_success_signal') === 'true') {
        setIsStripeSuccess(true);
        setStep(4);
        localStorage.removeItem('booking_success_signal');
        localStorage.removeItem('pending_stripe_url');
        localStorage.removeItem('last_booking_name');
        
        // Clear form data in this tab too
        setFormData({ name: '', email: '', phone: '', reg: '', carMake: '' });
        setSelectedService(null);
        setSelectedDate(null);
        setSelectedTime(null);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'booking_success_signal' && e.newValue === 'true') {
        checkSync();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSync();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Check for success query param on mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingStatus = urlParams.get('booking');
    const sessionId = urlParams.get('session_id');

    // Restore last booking name if it exists (for success message)
    const savedName = localStorage.getItem('last_booking_name');
    if (savedName) setLastBookingName(savedName);

    if (bookingStatus === 'success') {
      // Signal other tabs that we succeeded
      localStorage.setItem('booking_success_signal', 'true');
      
      // Clear form data for next time
      setFormData({ name: '', email: '', phone: '', reg: '', carMake: '' });
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setStep(4); // Default to success step while verifying
      
      localStorage.removeItem('last_booking_name');
      localStorage.removeItem('pending_stripe_url');

      if (sessionId) {
        setIsVerifying(true);
        fetch(`/api/verify-session?session_id=${sessionId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setIsStripeSuccess(true);
              setStep(4);
            } else {
              alert('Payment verification failed. Please contact us if you believe this is an error.');
              setStep(1);
            }
          })
          .catch(err => {
            console.error('Verification error', err);
            alert('Error verifying payment.');
            setStep(1);
          })
          .finally(() => {
            setIsVerifying(false);
            window.history.replaceState({}, document.title, window.location.pathname);
          });
      } else {
        setIsStripeSuccess(false);
        setStep(4);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else if (bookingStatus === 'cancelled') {
      alert('Payment was cancelled. Your booking was not completed.');
      localStorage.removeItem('pending_stripe_url');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      localStorage.removeItem('pending_stripe_url');
    }
  }, []);

  // Reset form if user clicks a "Book Now" link
  React.useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.getAttribute('href') === '#booking') {
        if (step !== 1) {
          setStep(1);
          setSelectedService(null);
          setSelectedDate(null);
          setSelectedTime(null);
          setFormData({ name: '', email: '', phone: '', reg: '', carMake: '' });
          localStorage.removeItem('pending_stripe_url');
        }
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [step]);

  // Auto-scroll to available times on mobile when a date is selected
  React.useEffect(() => {
    if (step === 2 && selectedDate && window.innerWidth < 1024) {
      const timer = setTimeout(() => {
        const el = document.getElementById('available-times');
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 250); // Give React time to render the time slots and expand the page height
      return () => clearTimeout(timer);
    }
  }, [selectedDate, step]);

  const handleRegBlur = async () => {
    const reg = formData.reg.replace(/\s+/g, '');
    if (!reg) return;
    setIsFetchingReg(true);
    setRegError(null);
    try {
      const response = await fetch(`/api/vehicle/${reg}`);
      if (response.ok) {
        const data = await response.json();
        if (data.make) {
          setFormData(prev => ({ ...prev, carMake: `${data.make} ${data.model || ''}`.trim() }));
        } else {
          setRegError('Vehicle not found. Please enter details manually.');
        }
      } else {
        setRegError('Lookup failed. Please enter details manually.');
        console.error('Vehicle lookup failed with status:', response.status);
      }
    } catch (error) {
      setRegError('Connection error. Please enter details manually.');
      console.error('Failed to fetch vehicle details', error);
    } finally {
      setIsFetchingReg(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedTime) return;
    
    // Validate UK Mobile Number
    const phoneClean = formData.phone.replace(/\s+/g, '');
    if (!phoneClean.startsWith('07') || phoneClean.length !== 11) {
      alert('Please enter a valid UK mobile number starting with 07 (e.g., 07123456789)');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/create-setup-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingDetails: {
            service_id: selectedService.id,
            service_name: selectedService.name,
            appointment_time: selectedTime.toISOString(),
            duration: selectedService.duration,
            customer_name: formData.name,
            customer_email: formData.email,
            customer_phone: formData.phone,
            vehicle_reg: formData.reg,
            vehicle_make: formData.carMake,
            no_show_fee: selectedService.noShowFee
          }
        })
      });
      
      const data = await response.json();
      if (data.url) {
        // Store name for success message later
        localStorage.setItem('last_booking_name', formData.name);
        
        // Store the URL in case they need to re-open it (popup blocker)
        localStorage.setItem('pending_stripe_url', data.url);

        // Move to success/pending step
        setLastBookingName(formData.name);
        setStep(4);
        setIsLoading(false);

        // Clear form data immediately
        setFormData({ name: '', email: '', phone: '', reg: '', carMake: '' });
        setSelectedService(null);
        setSelectedDate(null);
        setSelectedTime(null);

        // Stripe blocks iframes for security. If in AI Studio preview (iframe), open in new tab.
        if (window.self !== window.top) {
          const newWindow = window.open(data.url, '_blank');
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            alert('Your browser blocked the payment window. Please click the "COMPLETE PAYMENT" button that appeared on the page.');
          }
        } else {
          window.location.href = data.url;
        }
      } else if (data.success) {
        setStep(4);
      } else {
        alert(data.error || 'Failed to process booking. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const today = startOfToday();
  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(today, i + 1)).filter(d => d.getDay() !== 0 && d.getDay() !== 6);

  const [bookedSlots, setBookedSlots] = useState<{ appointment_time: string, service_id: string, status: string }[]>([]);

  // Fetch booked slots when date changes or periodically for "live" calendar
  React.useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchBookings = () => {
      if (selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        fetch(`/api/bookings?date=${dateStr}`)
          .then(res => {
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              throw new Error('Server returned non-JSON response');
            }
            return res.json();
          })
          .then(data => {
            if (data.bookings) {
              setBookedSlots(data.bookings);
            }
          })
          .catch(err => {
            // Only log if it's not a temporary network error (e.g. server restart)
            if (err.message !== 'Failed to fetch') {
              console.error('Failed to fetch bookings:', err.message);
            }
          });
      }
    };

    fetchBookings(); // Initial fetch

    // Refresh on window focus
    window.addEventListener('focus', fetchBookings);

    // Poll every 5 seconds for live updates
    intervalId = setInterval(fetchBookings, 5000);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', fetchBookings);
    };
  }, [selectedDate]);

  const generateTimeSlots = (date: Date, durationMinutes: number) => {
    const slots = [];
    const startHour = 9;
    const endHour = 17;
    const slotStep = 30; // Potential start times every 30 minutes

    const dayStart = setMinutes(setHours(date, startHour), 0);
    const dayEnd = setMinutes(setHours(date, endHour), 0);

    // Add lunch break as a booked slot (13:00 - 14:00)
    const lunchStart = setMinutes(setHours(date, 13), 0);
    const lunchEnd = setMinutes(setHours(date, 14), 0);

    const allBookings = [
      ...bookedSlots.map(booking => {
        const bookedStart = new Date(booking.appointment_time);
        const bookedService = bookingServices.find(s => s.id === booking.service_id);
        const bookedDuration = (booking as any).duration || (bookedService ? bookedService.duration : 60);
        const bookedEnd = addMinutes(bookedStart, bookedDuration);
        return { start: bookedStart, end: bookedEnd, isLunch: false };
      }),
      { start: lunchStart, end: lunchEnd, isLunch: true }
    ];

    let current = dayStart;
    while (addMinutes(current, durationMinutes) <= dayEnd) {
      const slotStart = new Date(current);
      const slotEnd = addMinutes(slotStart, durationMinutes);
      
      // 1. Check for lunch break (hard block - garage closed)
      const overlapsLunch = slotStart < lunchEnd && slotEnd > lunchStart;
      
      let isAvailable = !overlapsLunch;
      
      if (isAvailable) {
        // 2. Check for concurrency limit (max 2 bookings at any time)
        // Check every 15 minutes within the proposed slot for overlaps
        for (let t = new Date(slotStart); t < slotEnd; t = addMinutes(t, 15)) {
          // Count existing bookings at this specific time t
          // (Exclude lunch here as we handled it above)
          const concurrentCount = allBookings
            .filter(b => !b.isLunch) // exclude lunch from this count
            .filter(b => t >= b.start && t < b.end)
            .length;
            
          if (concurrentCount >= 2) {
            isAvailable = false;
            break;
          }
        }
      }

      if (isAvailable) {
        slots.push(slotStart);
      }
      
      current = addMinutes(current, slotStep);
    }
    return slots;
  };

  const timeSlots = selectedDate && selectedService ? generateTimeSlots(selectedDate, selectedService.duration) : [];

  const scrollToElement = (id: string, offset = 100) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 150);
  };

  const handleNext = () => {
    setStep(s => s + 1);
    scrollToElement('booking-content', 80);
  };
  const handleBack = () => {
    setStep(s => s - 1);
    scrollToElement('booking-content', 80);
  };

  const generateCalendarLinks = () => {
    if (!selectedTime || !selectedService) return { google: '', outlook: '', email: '', facebook: '' };
    
    const end = addMinutes(selectedTime, selectedService.duration);
    const title = encodeURIComponent(`${selectedService.name} at The MOT Garage`);
    const details = encodeURIComponent(`Appointment for ${selectedService.name}.\nReg: ${formData.reg}\nMake/Model: ${formData.carMake || 'Not provided'}\nLocation: Days Mill, Old Market, Nailsworth, GL6 0DU`);
    const startStr = selectedTime.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endStr = end.toISOString().replace(/-|:|\.\d\d\d/g, "");

    const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=The+MOT+Garage,+Nailsworth`;
    const outlook = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${title}&startdt=${selectedTime.toISOString()}&enddt=${end.toISOString()}&body=${details}&location=The+MOT+Garage,+Nailsworth`;
    const email = `mailto:?subject=${title}&body=I have booked an appointment: ${details} on ${format(selectedTime, 'PPpp')}`;
    const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${title}`;

    return { google, outlook, email, facebook };
  };

  const links = generateCalendarLinks();

  return (
    <section id="booking" className="py-32 bg-brand-dark relative border-t border-brand-border">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-brand-accent font-mono text-xs mb-4">SCHEDULE ONLINE</h2>
          <h3 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Book Your Appointment</h3>
        </div>

        <div id="booking-content" className="bg-brand-gray border border-brand-border overflow-hidden">
          {isVerifying ? (
            <div className="flex flex-col items-center justify-center p-24 min-h-[500px]">
              <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin mb-6"></div>
              <h4 className="text-2xl font-bold text-white mb-2">Verifying Payment...</h4>
              <p className="text-neutral-400 text-sm">Please wait while we confirm your transaction with Stripe.</p>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="flex border-b border-brand-border">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`flex-1 h-1 ${step >= i ? 'bg-brand-accent' : 'bg-transparent'} transition-colors duration-500`} />
                ))}
              </div>

              <div className="p-8 md:p-12 min-h-[500px] relative">
                <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h4 className="text-2xl font-bold text-white mb-8">Select a Service</h4>
                  <div className="grid gap-4">
                    {bookingServices.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => { setSelectedService(service); handleNext(); }}
                        className="flex items-center justify-between p-6 border border-brand-border hover:border-brand-accent bg-brand-dark/50 hover:bg-brand-dark transition-all duration-300 group text-left"
                      >
                        <div>
                          <h5 className="text-lg font-bold text-white group-hover:text-brand-accent transition-colors">{service.name}</h5>
                          <p className="text-xs font-mono text-neutral-500 mt-2">{service.duration >= 60 ? `${Math.floor(service.duration/60)} HR ${service.duration%60 > 0 ? `${service.duration%60} MINS` : ''}` : `${service.duration} MINS`}</p>
                        </div>
                        <ChevronRight className="text-neutral-600 group-hover:text-brand-accent transition-colors" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="flex items-center gap-4 mb-10">
                    <button onClick={handleBack} className="p-2 hover:bg-white/5 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-brand-border">
                      <ArrowLeft size={20} />
                    </button>
                    <h4 className="text-2xl font-bold text-white">Select Date & Time</h4>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-10">
                    <div>
                      <h5 className="text-xs font-mono text-neutral-500 mb-6 flex items-center gap-2"><CalendarIcon size={14} /> AVAILABLE DATES</h5>
                      <div className="grid grid-cols-3 gap-3">
                        {availableDates.slice(0, 9).map((date, i) => (
                          <button
                            key={i}
                            onClick={() => { 
                              setSelectedDate(date); 
                              setSelectedTime(null); 
                            }}
                            className={`p-4 border text-center transition-all duration-300 ${selectedDate && isSameDay(selectedDate, date) ? 'border-brand-accent bg-brand-accent text-white' : 'border-brand-border hover:border-brand-accent/50 text-neutral-400 hover:text-white bg-brand-dark/50'}`}
                          >
                            <div className="text-[10px] font-mono mb-1">{format(date, 'EEE')}</div>
                            <div className="text-xl font-bold mb-1">{format(date, 'd')}</div>
                            <div className="text-[10px] font-mono">{format(date, 'MMM')}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div id="available-times">
                      <h5 className="text-xs font-mono text-neutral-500 mb-6 flex items-center gap-2"><Clock size={14} /> AVAILABLE TIMES</h5>
                      {selectedDate ? (
                        <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                          {timeSlots.map((time, i) => (
                            <button
                              key={i}
                              onClick={() => { setSelectedTime(time); handleNext(); }}
                              className="p-4 border border-brand-border hover:border-brand-accent/50 bg-brand-dark/50 hover:bg-brand-dark text-white transition-all duration-300 font-mono text-sm"
                            >
                              {format(time, 'HH:mm')}
                            </button>
                          ))}
                          {timeSlots.length === 0 && (
                            <div className="col-span-2 text-center p-6 text-neutral-500 text-sm font-mono">No slots available for this date.</div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center p-8 border border-dashed border-brand-border text-neutral-500 text-sm font-mono text-center">
                          Please select a date first to view available times.
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="flex items-center gap-4 mb-10">
                    <button onClick={handleBack} className="p-2 hover:bg-white/5 text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-brand-border">
                      <ArrowLeft size={20} />
                    </button>
                    <h4 className="text-2xl font-bold text-white">Your Details</h4>
                  </div>

                  <div className="bg-brand-dark/50 border border-brand-accent/30 p-6 mb-10 flex flex-col gap-4">
                    <div className="flex items-start gap-5">
                      <div className="mt-1 text-brand-accent"><CheckCircle2 size={20} /></div>
                      <div>
                        <p className="text-white font-bold text-lg mb-1">{selectedService?.name}</p>
                        <p className="text-xs font-mono text-neutral-400">{selectedTime && format(selectedTime, 'EEEE, MMMM do yyyy @ HH:mm')}</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-brand-border/50">
                      <p className="text-xs font-mono text-white mb-2 uppercase tracking-wider">No-Show Policy</p>
                      <p className="text-sm text-neutral-400 leading-relaxed">
                        To secure your booking, we verify your card details. <span className="text-white font-bold">No money is taken today.</span> We reserve the right to charge a £30 fee for no-shows or cancellations with less than 24 hours notice.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <p className="text-[10px] font-mono text-emerald-500 uppercase">Secure verification via Stripe PCI-DSS</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-mono text-neutral-500 mb-2">FULL NAME</label>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-brand-dark border border-brand-border px-5 py-4 text-white focus:outline-none focus:border-brand-accent transition-colors" placeholder="John Doe" autoComplete="new-password" />
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-neutral-500 mb-2">VEHICLE REGISTRATION</label>
                        <input required type="text" value={formData.reg} onBlur={handleRegBlur} onChange={e => setFormData({...formData, reg: e.target.value.toUpperCase()})} className="w-full bg-brand-dark border border-brand-border px-5 py-4 text-white focus:outline-none focus:border-brand-accent transition-colors font-mono uppercase" placeholder="AB12 CDE" autoComplete="new-password" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-mono text-neutral-500 mb-2">CAR MAKE & MODEL {isFetchingReg && <span className="text-brand-accent animate-pulse">(Fetching...)</span>} {regError && <span className="text-red-500">({regError})</span>}</label>
                        <input type="text" value={formData.carMake} onChange={e => setFormData({...formData, carMake: e.target.value})} className="w-full bg-brand-dark border border-brand-border px-5 py-4 text-white focus:outline-none focus:border-brand-accent transition-colors" placeholder="e.g. Ford Fiesta" autoComplete="new-password" />
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-neutral-500 mb-2">EMAIL ADDRESS</label>
                        <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-brand-dark border border-brand-border px-5 py-4 text-white focus:outline-none focus:border-brand-accent transition-colors" placeholder="john@example.com" autoComplete="new-password" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-mono text-neutral-500 mb-2">PHONE NUMBER</label>
                        <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-brand-dark border border-brand-border px-5 py-4 text-white focus:outline-none focus:border-brand-accent transition-colors" placeholder="07123 456789" autoComplete="new-password" />
                      </div>
                    </div>
                    <button disabled={isLoading} type="submit" className="w-full bg-brand-accent hover:bg-brand-accent-hover text-white font-bold font-mono text-sm py-5 mt-6 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0">
                      {isLoading ? 'PROCESSING...' : 'SECURE BOOKING WITH CARD'}
                    </button>
                    <p className="text-[10px] text-center text-neutral-500 font-mono mt-4">
                      You will be redirected to Stripe to securely verify your card. 
                      Your bank may ask you to confirm a £0.00 transaction.
                    </p>
                  </form>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-24 h-24 border border-brand-accent/30 text-brand-accent flex items-center justify-center mx-auto mb-8">
                    <CheckCircle2 size={40} />
                  </div>
                  <h4 className="text-4xl font-bold text-white mb-4">
                    {isStripeSuccess ? 'Card Details Verified' : 'Booking Confirmed'}
                  </h4>
                  <p className="text-neutral-400 mb-10 max-w-md mx-auto leading-relaxed">
                    {isStripeSuccess 
                      ? 'Thank you! Your card details have been securely saved. Your booking is confirmed. Please check your email and mobile phone for details.'
                      : (localStorage.getItem('pending_stripe_url') 
                          ? 'Payment has been initiated in a new tab. Please complete the verification there to confirm your booking.'
                          : `Thank you, ${lastBookingName || 'customer'}. Your appointment is confirmed. Please check your email and mobile phone for details.`)}
                  </p>

                  {localStorage.getItem('pending_stripe_url') && !isStripeSuccess && (
                    <div className="mb-10">
                      <button 
                        onClick={() => {
                          const url = localStorage.getItem('pending_stripe_url');
                          if (url) window.open(url, '_blank');
                        }}
                        className="bg-brand-accent hover:bg-brand-accent-hover text-white font-bold font-mono text-sm px-8 py-4 transition-all"
                      >
                        COMPLETE PAYMENT / RE-OPEN
                      </button>
                      <p className="text-[10px] text-neutral-500 font-mono mt-2">
                        Click here if the payment window didn't open or was closed.
                      </p>
                    </div>
                  )}

                  <div className="bg-brand-dark/50 border border-brand-border p-8 max-w-md mx-auto mb-10">
                    <h5 className="text-xs font-mono text-neutral-500 mb-6">ADD TO CALENDAR / SHARE</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <a href={links.google} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-white text-black py-4 text-xs font-mono font-bold hover:bg-neutral-200 transition-colors">
                        GMAIL
                      </a>
                      <a href={links.outlook} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#0078D4] text-white py-4 text-xs font-mono font-bold hover:bg-[#006cbd] transition-colors">
                        OUTLOOK
                      </a>
                      <a href={links.email} className="flex items-center justify-center gap-2 bg-neutral-800 text-white py-4 text-xs font-mono font-bold hover:bg-neutral-700 transition-colors">
                        <Mail size={16} /> EMAIL
                      </a>
                      <a href={links.facebook} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#1877F2] text-white py-4 text-xs font-mono font-bold hover:bg-[#166fe5] transition-colors">
                        <Facebook size={16} /> SHARE
                      </a>
                    </div>
                  </div>

                  <button onClick={() => { 
                    setStep(1); 
                    setSelectedService(null); 
                    setSelectedDate(null); 
                    setSelectedTime(null); 
                    setFormData({name:'', email:'', phone:'', reg:'', carMake:''}); 
                    localStorage.removeItem('pending_stripe_url');
                    scrollToElement('booking-content', 80);
                  }} className="text-brand-accent hover:text-white transition-colors text-xs font-mono font-bold">
                    BOOK ANOTHER APPOINTMENT
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </>
          )}
        </div>
      </div>
    </section>
  );
}
