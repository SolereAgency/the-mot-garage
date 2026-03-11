import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';

interface CallContextType {
  isCalling: boolean;
  startCall: () => void;
  stopCall: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};

export const CallProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isCalling, setIsCalling] = useState(false);
  const retellClientRef = useRef<any>(null);

  useEffect(() => {
    retellClientRef.current = new RetellWebClient();
    
    retellClientRef.current.on('call_started', () => setIsCalling(true));
    retellClientRef.current.on('call_ended', () => setIsCalling(false));
    retellClientRef.current.on('error', (error: any) => {
      console.error('Retell error:', error);
      setIsCalling(false);
    });

    return () => {
      if (isCalling) retellClientRef.current?.stopCall();
    };
  }, []);

  const startCall = async () => {
    try {
      setIsCalling(true); // Optimistic UI
      const response = await fetch('/api/create-web-call', { method: 'POST' });
      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error(data.error || 'No access token received');
      }
      
      await retellClientRef.current.startCall({ accessToken: data.access_token });
    } catch (error) {
      console.error('Failed to start call:', error);
      setIsCalling(false);
      alert('Voice assistant is currently unavailable. Please ensure API keys are configured.');
    }
  };

  const stopCall = () => {
    retellClientRef.current?.stopCall();
    setIsCalling(false);
  };

  return (
    <CallContext.Provider value={{ isCalling, startCall, stopCall }}>
      {children}
      {isCalling && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-accent text-white p-4 rounded-full shadow-lg flex items-center gap-4 animate-pulse">
          <div className="w-3 h-3 bg-white rounded-full animate-ping" />
          <span className="font-mono text-sm font-bold">AI ASSISTANT ACTIVE</span>
          <button 
            onClick={stopCall} 
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-bold transition-colors"
          >
            END CALL
          </button>
        </div>
      )}
    </CallContext.Provider>
  );
};
