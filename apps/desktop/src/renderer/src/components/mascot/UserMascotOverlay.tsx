import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const UserMascotOverlay: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [userMascotUrl, setUserMascotUrl] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=User&backgroundColor=b6e3f4');

  useEffect(() => {
    // Read from localStorage initially
    const savedUrl = localStorage.getItem('userMascotUrl');
    if (savedUrl) setUserMascotUrl(savedUrl);

    // Listen for changes from SettingsModal
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userMascotUrl' && e.newValue) {
        setUserMascotUrl(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // IPC event listener for recording state
    if (window.electron && window.electron.ipcRenderer) {
      const handleStart = () => setIsRecording(true);
      const handleStop = () => setIsRecording(false);

      window.electron.ipcRenderer.on('STT_START', handleStart);
      window.electron.ipcRenderer.on('STT_STOP', handleStop);

      return () => {
        window.electron.ipcRenderer.removeListener('STT_START', handleStart);
        window.electron.ipcRenderer.removeListener('STT_STOP', handleStop);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      background: 'transparent'
    }}>
      <div className="relative flex items-center justify-center w-full h-full">
        {/* Animated Sound Waves */}
        <AnimatePresence>
          {isRecording && (
            <>
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={`wave-${i}`}
                  initial={{ opacity: 0.8, scale: 0.8 }}
                  animate={{ opacity: 0, scale: 2 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.4,
                    ease: "easeOut"
                  }}
                  className="absolute rounded-full border-2 border-green-400 bg-green-500/20"
                  style={{ width: '80%', height: '80%' }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* User Mascot Avatar */}
        <motion.div 
          animate={{ scale: isRecording ? [1, 1.1, 1] : 1 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          className={`relative z-10 w-16 h-16 overflow-hidden ${
            userMascotUrl.startsWith('data:') 
              ? '' // No border/background for custom uploads
              : 'rounded-full border-4 border-slate-700 bg-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]'
          }`}
        >
          <img 
            src={userMascotUrl} 
            alt="User Mascot" 
            className="w-full h-full object-cover"
          />
        </motion.div>
      </div>
    </div>
  );
};
