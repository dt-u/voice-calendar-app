import React from 'react';
import { Task } from '../../types';
import { CheckCircle2, Circle, Clock, Star, Edit2, Trash2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TaskListProps {
  tasks: Task[];
  intentReply?: string;
  onToggleComplete?: (task: Task) => void;
  onTogglePriority?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  showDate?: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  intentReply,
  onToggleComplete,
  onTogglePriority,
  onEdit,
  onDelete,
  showDate = false
}) => {
  if (tasks.length === 0 && !intentReply) return null;

  return (
    <div className="flex flex-col gap-3 w-full no-drag-region">
      {intentReply && (
        <div className="mb-2 text-sm font-medium text-blue-200 border-b border-gray-700/50 pb-3">
          {intentReply}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="space-y-3">
          {tasks.map((task, idx) => (
            <div key={task.id || idx} className={`group flex items-start gap-3 bg-gray-800/50 p-3 rounded-xl border border-gray-700/30 transition-all ${task.is_completed ? 'opacity-60' : ''}`}>
              <button 
                onClick={() => onToggleComplete && onToggleComplete(task)}
                className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-green-400 transition-colors"
              >
                {task.is_completed ? <CheckCircle2 size={18} className="text-green-400" /> : <Circle size={18} />}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium break-words ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-100'}`}>
                  {task.content}
                </p>
                {task.note && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.note}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                  {showDate && (
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{format(parseISO(task.task_date), 'dd/MM')}</span>
                    </div>
                  )}
                  {(task.exact_time || task.start_time || task.time_slot) && (
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>
                        {task.start_time && task.end_time 
                          ? `${task.start_time} - ${task.end_time}` 
                          : (task.start_time || task.exact_time || task.time_slot)}
                      </span>
                    </div>
                  )}
                  <button 
                    onClick={() => onTogglePriority && onTogglePriority(task)}
                    className={`flex items-center gap-1 transition-colors ${task.is_important ? 'text-yellow-500' : 'hover:text-yellow-500/70'}`}
                  >
                    <Star size={12} fill={task.is_important ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>

              {/* Hover Actions */}
              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                <button 
                  onClick={() => onEdit && onEdit(task)}
                  className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700/50 rounded-md transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => onDelete && onDelete(task)}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-md transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
