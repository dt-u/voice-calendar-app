import React, { useState } from 'react';
import { Send, Mic } from 'lucide-react';

interface QuickInputProps {
  onSubmit: (text: string) => void;
  isRecording: boolean;
}

export const QuickInput: React.FC<QuickInputProps> = ({ onSubmit, isRecording }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 w-80 bg-gray-900/90 backdrop-blur-md rounded-full p-2 pr-3 shadow-2xl border border-gray-700/50 no-drag-region">
      <div className={`p-2 rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-gray-400'}`}>
        <Mic size={16} />
      </div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a command or Hold Alt to talk..."
        className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
      />
      <button 
        type="submit" 
        disabled={!text.trim()}
        className="p-2 text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        <Send size={16} />
      </button>
    </form>
  );
};
