import React from 'react';
import { Task } from '../../types';
import { CheckCircle2, Circle, Clock, Star } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  intentReply?: string;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, intentReply }) => {
  if (tasks.length === 0 && !intentReply) return null;

  return (
    <div className="bg-gray-900/90 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-gray-700/50 text-white w-80 max-h-96 overflow-y-auto no-drag-region">
      {intentReply && (
        <div className="mb-4 text-sm font-medium text-blue-200 border-b border-gray-700/50 pb-3">
          {intentReply}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today's Schedule</h3>
          {tasks.map((task, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700/30">
              <button className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-green-400 transition-colors">
                {task.status === 'completed' ? <CheckCircle2 size={18} className="text-green-400" /> : <Circle size={18} />}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.content}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{task.exact_time || task.time_slot}</span>
                  </div>
                  {task.is_important && (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={12} fill="currentColor" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
