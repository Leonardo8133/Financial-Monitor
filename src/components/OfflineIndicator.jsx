import { useState, useEffect } from 'react';
import { WifiIcon } from '@heroicons/react/24/outline';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-all duration-300 ${
          isOnline 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}
        title={isOnline ? 'Conectado à internet' : 'Não conectado à internet - Seus dados estão seguros'}
      >
        <WifiIcon className={`h-4 w-4 ${isOnline ? 'text-green-600' : 'text-red-600'}`} />
        <span className="text-xs font-medium">
          {isOnline ? 'Conectado' : 'Não conectado'}
        </span>
      </div>
    </div>
  );
}