/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import Booking from './components/Booking';
import Reviews from './components/Reviews';
import Footer from './components/Footer';
import BookingStatus from './components/BookingStatus';
import Admin from './components/Admin';
import { CallProvider } from './context/CallContext';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const isAdmin = path === '/admin';

  return (
    <CallProvider>
      <div className="min-h-screen bg-brand-dark text-white selection:bg-brand-accent selection:text-white">
        {!isAdmin && <BookingStatus />}
        <Navbar />
        
        <main>
          {isAdmin ? (
            <Admin />
          ) : (
            <>
              <Hero />
              <Services />
              <Reviews />
              <Booking />
            </>
          )}
        </main>

        <Footer />
      </div>
    </CallProvider>
  );
}
