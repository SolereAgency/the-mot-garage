import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function BookingStatus() {
  const [status, setStatus] = useState<'loading' | 'success' | 'cancelled' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingStatus = params.get('booking');
    const sessionId = params.get('session_id');

    if (bookingStatus === 'success' && sessionId) {
      setStatus('loading');
      
      // Verify the session
      fetch(`/api/verify-session?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStatus('success');
            setMessage('Your booking has been successfully confirmed and your card details have been securely verified. No money has been taken. We have sent you an email with the details.');
          } else {
            setStatus('error');
            setMessage('There was an issue verifying your booking. Please contact us.');
          }
        })
        .catch(err => {
          console.error('Verification error:', err);
          setStatus('error');
          setMessage('There was an error verifying your booking. Please contact us.');
        })
        .finally(() => {
          // Clean up the URL
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    } else if (bookingStatus === 'cancelled') {
      setStatus('cancelled');
      setMessage('Your booking process was cancelled. No charges were made.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (!status) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-brand-gray border border-white/10 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl relative">
        <button 
          onClick={() => window.location.href = '/'}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <XCircle className="w-6 h-6" />
        </button>

        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-brand-accent animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Verifying Booking...</h2>
            <p className="text-gray-400">Please wait while we confirm your payment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full py-3 bg-brand-accent hover:bg-brand-accent-hover text-white font-semibold rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {status === 'cancelled' && (
          <div className="flex flex-col items-center">
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Booking Cancelled</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <button 
              onClick={() => setStatus(null)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Verification Error</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <button 
              onClick={() => setStatus(null)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
