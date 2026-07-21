import React from 'react';
import { motion } from 'framer-motion';
import { MascotState } from '../../types';

interface MascotProps {
  state: MascotState;
}

export const Mascot: React.FC<MascotProps> = ({ state }) => {
  const getAnimationVariants = () => {
    switch (state) {
      case 'LISTENING':
        return {
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8],
          transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
        };
      case 'THINKING':
        return {
          rotate: [0, 10, -10, 0],
          transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' }
        };
      case 'SPEAKING':
        return {
          y: [0, -10, 0],
          scale: [1, 1.05, 1],
          transition: { repeat: Infinity, duration: 0.5, ease: 'easeInOut' }
        };
      case 'IDLE':
      default:
        return {
          y: [0, -5, 0],
          transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' }
        };
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case 'LISTENING': return 'bg-red-500 shadow-red-500/50';
      case 'THINKING': return 'bg-yellow-400 shadow-yellow-400/50';
      case 'SPEAKING': return 'bg-green-400 shadow-green-400/50';
      case 'IDLE': default: return 'bg-blue-400 shadow-blue-400/50';
    }
  };

  return (
    <div className="relative flex flex-col items-center drag-region">
      {/* Tooltip state */}
      <motion.div 
        className="absolute -top-8 bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={state}
      >
        {state}
      </motion.div>

      {/* Mascot Body */}
      <motion.div
        animate={getAnimationVariants()}
        className={`w-24 h-24 rounded-full shadow-lg border-4 border-white/20 flex items-center justify-center ${getStatusColor()}`}
      >
        {/* Simple face */}
        <div className="flex gap-3">
          <motion.div 
            className="w-3 h-3 bg-white rounded-full"
            animate={state === 'SPEAKING' ? { scaleY: [1, 0.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.2 }}
          />
          <motion.div 
            className="w-3 h-3 bg-white rounded-full"
            animate={state === 'SPEAKING' ? { scaleY: [1, 0.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.2 }}
          />
        </div>
      </motion.div>
    </div>
  );
};
