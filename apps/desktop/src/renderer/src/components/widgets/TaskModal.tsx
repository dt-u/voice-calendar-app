import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Star, Type, AlignLeft } from 'lucide-react';
import { Task } from '../../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  initialData?: Partial<Task> | null;
  selectedDate?: Date;
}

export const TaskModal: React.FC<TaskModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData, 
  selectedDate 
}) => {
  const [content, setContent] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setContent(initialData?.content || '');
      
      let defaultDate = '';
      if (initialData?.task_date) {
        defaultDate = initialData.task_date;
      } else if (selectedDate) {
        const y = selectedDate.getFullYear();
        const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(selectedDate.getDate()).padStart(2, '0');
        defaultDate = `${y}-${m}-${d}`;
      }
      setTaskDate(defaultDate);
      
      setStartTime(initialData?.start_time || '');
      setEndTime(initialData?.end_time || '');
      setIsImportant(initialData?.is_important || false);
      setNote(initialData?.note || '');
    }
  }, [isOpen, initialData, selectedDate]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!content.trim()) return;
    onSave({
      id: initialData?.id,
      content,
      task_date: taskDate,
      start_time: startTime || null,
      end_time: endTime || null,
      is_important: isImportant,
      note: note || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-auto p-4">
      <div className="bg-gray-900 border border-gray-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-800/50 bg-gray-900/80">
          <h2 className="text-lg font-bold text-white">
            {initialData?.id ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-400">
              <Type size={14} /> Task Title
            </label>
            <input 
              type="text" 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What do you need to do?"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
          </div>

          {/* Date & Priority */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-400">
                <Calendar size={14} /> Date
              </label>
              <input 
                type="date" 
                value={taskDate}
                onChange={e => setTaskDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-400">
                Priority
              </label>
              <button
                type="button"
                onClick={() => setIsImportant(!isImportant)}
                className={`flex items-center gap-2 w-full justify-center border rounded-lg p-2.5 transition-colors ${
                  isImportant 
                    ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                <Star size={18} fill={isImportant ? 'currentColor' : 'none'} />
                {isImportant ? 'Important' : 'Normal'}
              </button>
            </div>
          </div>

          {/* Time Range */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-400">
                <Clock size={14} /> Start Time
              </label>
              <input 
                type="time" 
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-400">
                End Time
              </label>
              <input 
                type="time" 
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-400">
              <AlignLeft size={14} /> Note
            </label>
            <textarea 
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add details, links, or context..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors custom-scrollbar"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-800/50 bg-gray-900/80 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!content.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            {initialData?.id ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};
