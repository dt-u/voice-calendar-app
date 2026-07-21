import React, { useState } from 'react';
import { Send, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';

interface QuickInputProps {
  onAddManualTask: (content: string) => void;
  selectedDate: Date;
}

export const QuickInput: React.FC<QuickInputProps> = ({ onAddManualTask, selectedDate }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAddManualTask(text);
      setText('');
    }
  };

  const formattedDate = format(selectedDate, 'dd/MM/yyyy');

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full mt-4 no-drag-region">
      <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2 border border-gray-700/50 focus-within:border-blue-500 transition-colors">
        <PlusCircle size={18} className="text-gray-400 ml-1" />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Thêm task nhanh cho ngày ${formattedDate}...`}
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
        />
        <button 
          type="submit" 
          disabled={!text.trim()}
          className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={14} />
        </button>
      </div>
    </form>
  );
};
