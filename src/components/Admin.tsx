import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, AlertCircle, CheckCircle2, CreditCard, User, Calendar, Car } from 'lucide-react';

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_name: string;
  appointment_time: string;
  vehicle_reg: string;
  vehicle_make: string;
  status: string;
  payment_method_id?: string;
  no_show_fee?: number;
  no_show_fee_paid?: number;
}

export default function Admin() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chargingId, setChargingId] = useState<string | null>(null);
  const [password, setPassword] = useState(localStorage.getItem('admin_password') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchBookings = async () => {
    if (!password) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/bookings', {
        headers: { 'x-admin-password': password }
      });
      
      if (response.status === 401) {
        setIsAuthenticated(false);
        setError('Invalid password');
        return;
      }

      const data = await response.json();
      if (data.bookings) {
        setBookings(data.bookings);
        setIsAuthenticated(true);
        setError(null);
        localStorage.setItem('admin_password', password);
      } else {
        setError(data.error || 'Failed to fetch bookings');
      }
    } catch (err) {
      setError('Connection error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (password) {
      fetchBookings();
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleChargeNoShow = async (booking: Booking) => {
    const hasCard = !!booking.payment_method_id;
    const amount = booking.no_show_fee || 30;
    
    const confirmMsg = hasCard 
      ? `Are you sure you want to charge £${amount} no-show fee to ${booking.customer_name}?`
      : `No card on file for ${booking.customer_name}. Mark as no-show anyway?`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setChargingId(booking.id);
    try {
      const response = await fetch('/api/admin/charge-no-show', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify({ bookingId: booking.id, amount })
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message || 'No-show marked successfully!');
        fetchBookings();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to process no-show.');
      console.error(err);
    } finally {
      setChargingId(null);
    }
  };

  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-brand-gray border border-brand-border p-8 rounded-2xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-brand-accent" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Admin Access</h2>
            <p className="text-neutral-400 text-sm">Please enter your admin password to continue.</p>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); fetchBookings(); }} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="w-full bg-brand-dark border border-brand-border rounded-lg px-4 py-3 text-white focus:border-brand-accent outline-none transition-all font-mono"
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
            <button
              type="submit"
              className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3 rounded-lg transition-all uppercase tracking-widest text-xs"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-brand-accent font-mono text-xs mb-4 uppercase tracking-widest">Admin Dashboard</h2>
            <h1 className="text-4xl font-bold text-white tracking-tight">Booking Management</h1>
          </div>
          <button 
            onClick={fetchBookings}
            className="px-6 py-2 border border-brand-border text-xs font-mono text-neutral-400 hover:text-white hover:border-brand-accent transition-all"
          >
            REFRESH
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg flex items-center gap-3 text-red-500 mb-8">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        <div className="grid gap-6">
          {bookings.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-brand-border rounded-xl">
              <p className="text-neutral-500 font-mono">No bookings found.</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="bg-brand-gray border border-brand-border p-6 hover:border-brand-accent/30 transition-all group">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 flex-1">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-mono uppercase tracking-wider">
                        <User size={12} /> Customer
                      </div>
                      <p className="text-white font-bold">{booking.customer_name}</p>
                      <p className="text-neutral-400 text-xs">{booking.customer_email}</p>
                      <p className="text-neutral-400 text-xs">{booking.customer_phone}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-mono uppercase tracking-wider">
                        <Calendar size={12} /> Appointment
                      </div>
                      <p className="text-white font-bold">{format(new Date(booking.appointment_time), 'PPp')}</p>
                      <p className="text-brand-accent text-xs font-mono">{booking.service_name}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-mono uppercase tracking-wider">
                        <Car size={12} /> Vehicle
                      </div>
                      <p className="text-white font-bold uppercase font-mono">{booking.vehicle_reg}</p>
                      <p className="text-neutral-400 text-xs">{booking.vehicle_make}</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-mono uppercase tracking-wider">
                        <CreditCard size={12} /> Payment Status
                      </div>
                      <div className="flex items-center gap-2">
                        {booking.status === 'no_show_charged' ? (
                          <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 size={14} /> No-Show Charged (£{booking.no_show_fee_paid})
                          </span>
                        ) : booking.status === 'no_show_marked' ? (
                          <span className="text-amber-500 text-xs font-bold flex items-center gap-1">
                            <AlertCircle size={14} /> No-Show Marked (No Charge)
                          </span>
                        ) : booking.payment_method_id ? (
                          <span className="text-blue-400 text-xs font-bold flex items-center gap-1">
                            <CreditCard size={14} /> Card Saved
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-xs font-bold">No Card Saved</span>
                        )}
                      </div>
                      <p className="text-neutral-500 text-[10px] font-mono uppercase">Status: {booking.status}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {booking.status === 'confirmed' && (
                      <button
                        disabled={chargingId === booking.id}
                        onClick={() => handleChargeNoShow(booking)}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-900 text-white text-xs font-bold font-mono transition-all"
                      >
                        {chargingId === booking.id ? 'PROCESSING...' : 'MARK NO-SHOW'}
                      </button>
                    )}
                    {(booking.status === 'no_show_charged' || booking.status === 'no_show_marked') && (
                      <div className="px-6 py-3 border border-neutral-500/30 text-neutral-500 text-xs font-bold font-mono">
                        {booking.status === 'no_show_charged' ? 'CHARGED' : 'MARKED'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
