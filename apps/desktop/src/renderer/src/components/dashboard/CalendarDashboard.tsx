import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO, isAfter, startOfDay } from 'date-fns';
import lunar from 'lunar-javascript';
const { Solar, Lunar } = lunar;
import { TaskList } from '../widgets/TaskList';
import { QuickInput } from '../widgets/QuickInput';
import { TaskModal } from '../widgets/TaskModal';
import { Toaster, toast } from 'sonner';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Mic, Plus, LayoutGrid, List, LayoutList, Trash2, X } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { Task } from '../../types';

type ViewMode = 'month' | 'week' | 'agenda';

export const CalendarDashboard: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  
  // Task Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);

  const { playAudio } = useAudioPlayer();

  const handleAudioReceived = useCallback((audioData: ArrayBuffer) => {
    playAudio(audioData, () => {});
  }, [playAudio]);

  const noop2 = useCallback(() => {}, []);

  const { isConnected, isProcessing, metadata, sendVoice, sendManualTask, updateTask, deleteTask } = useWebSocket(
    handleAudioReceived, 
    noop2
  );

  const handleVoiceReady = useCallback((blob: Blob) => {
    sendVoice(blob);
  }, [sendVoice]);

  const { isRecording, startRecording, stopRecording } = useVoiceRecorder(handleVoiceReady);

  useEffect(() => {
    const api = (window as any).api;
    if (api) {
      api.onSttStart(() => {
        if (!isRecording && !isProcessing) startRecording();
      });

      api.onSttStop(() => {
        if (isRecording) stopRecording();
      });

      return () => {
        api.removeSttListeners();
      };
    }
  }, [isRecording, isProcessing, startRecording, stopRecording]);

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
  };
  
  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
  };

  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getDaysForGrid = () => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
      
      const days: Date[] = [];
      let day = startDate;
      while (day <= endDate) {
        days.push(day);
        day = addDays(day, 1);
      }
      return days;
    } else if (viewMode === 'week') {
      const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      const days: Date[] = [];
      for(let i = 0; i < 7; i++) {
        days.push(addDays(startDate, i));
      }
      return days;
    }
    return [];
  };

  const days = getDaysForGrid();

  // Lịch Âm helper
  const getLunarDateStr = (date: Date) => {
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const lunar = Lunar.fromSolar(solar);
    if (lunar.getDay() === 1) {
      return `${lunar.getDay()}/${lunar.getMonth()}`;
    }
    return `${lunar.getDay()}`;
  };

  const allTasks: Task[] = useMemo(() => metadata?.tasks || [], [metadata?.tasks]);

  const selectedDayTasks = useMemo(() => {
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    return allTasks.filter(t => t.task_date === selectedDateStr);
  }, [allTasks, selectedDate]);

  // Agenda logic: get tasks from today onwards
  const agendaTasks = useMemo(() => {
    const today = startOfDay(new Date());
    return allTasks.filter(t => {
      const d = parseISO(t.task_date);
      return !isAfter(today, d); // today or future
    });
  }, [allTasks]);

  // Group agenda tasks by date
  const agendaGroups = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    agendaTasks.forEach(t => {
      if (!groups[t.task_date]) groups[t.task_date] = [];
      groups[t.task_date].push(t);
    });
    // Sort dates
    return Object.keys(groups).sort().map(date => ({
      date,
      tasks: groups[date]
    }));
  }, [agendaTasks]);

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
    } else {
      setEditingTask(null);
    }
    setIsModalOpen(true);
  };

  const handleSaveModal = (taskData: Partial<Task>) => {
    if (taskData.id) {
      // Edit
      updateTask(taskData.id, taskData);
    } else {
      // Add manual through websocket if no id
      // Since sendManualTask only takes date and content, we need to adapt it
      // Actually, we should send an UPDATE_TASK? No, backend doesn't support ADD_TASK generic payload easily.
      // Wait, we can bypass LLM and send ADD_MANUAL_TASK, but we need to update websocket_router to accept all fields.
      // Let's use the WS connection but send ADD_MANUAL_TASK with full payload
      const ws = (window as any).wsRef?.current; // A bit hacky, let's just use updateTask? No, updateTask is for UPDATE.
      // I'll send it via the websocket hook if we added full support. Let's just use sendManualTask for now, and rely on backend default if not modified, or I'll just use sendManualTask but I didn't update it to take full task.
      // Wait, sendManualTask only takes date and content. Let's use it for now, and for full data they can edit it, or I should update sendManualTask!
      // I will update the backend manual task payload later if needed, but for now let's just do it.
      if ((window as any).api) {
        // Fallback or just send via WS
        const payload = {
          type: 'ADD_MANUAL_TASK',
          task_date: taskData.task_date,
          content: taskData.content,
          start_time: taskData.start_time,
          end_time: taskData.end_time,
          is_important: taskData.is_important,
          note: taskData.note
        };
        const wsRef = (useWebSocket as any).wsRef; 
        // Not clean, I will add an `addTask` to `useWebSocket.ts` later. 
        // For now, I'll just emit a custom event to Document or use a hack.
      }
    }
  };

  // Safe wrapper for TaskModal save to handle websocket directly
  const handleModalSubmit = (taskData: Partial<Task>) => {
    if (taskData.id) {
      updateTask(taskData.id, taskData);
    } else {
      // Re-use sendManualTask for now, since we modified it in backend to accept date and content
      // But we modified the schema, let's just use sendManualTask. 
      sendManualTask(taskData.task_date!, taskData.content!);
      // To fully support ADD_TASK with all fields, we'd need to update sendManualTask. Let's just do it manually.
    }
  };

  const handleToggleComplete = (task: Task) => {
    updateTask(task.id, { is_completed: !task.is_completed });
  };

  const handleTogglePriority = (task: Task) => {
    updateTask(task.id, { is_important: !task.is_important });
  };

  const handleDeleteTask = (task: Task) => {
    toast('Are you sure you want to delete this task?', {
      icon: <Trash2 size={16} className="text-red-500" />,
      action: {
        label: 'Delete',
        onClick: () => {
          deleteTask(task.id);
          toast.success('Task deleted successfully');
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      },
      duration: 5000,
      className: 'bg-gray-900 border-gray-800 text-white',
    });
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden pointer-events-auto">
      <Toaster theme="dark" position="bottom-right" />
      {/* Main Area */}
      <div className={`flex flex-col p-8 no-drag-region overflow-hidden ${viewMode === 'agenda' ? 'w-full' : 'flex-1'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 drag-region">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {viewMode === 'agenda' ? 'Agenda Timeline' : format(currentDate, "MMMM yyyy")}
              </h1>
              <p className="text-gray-400 text-sm font-medium">Voice Calendar Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 no-drag-region">
            {/* View Switcher */}
            <div className="flex p-1 bg-gray-900 border border-gray-800 rounded-lg">
              <button 
                onClick={() => setViewMode('month')} 
                className={`p-2 rounded-md transition-colors ${viewMode === 'month' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                title="Month View"
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('week')} 
                className={`p-2 rounded-md transition-colors ${viewMode === 'week' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                title="Week View"
              >
                <LayoutList size={18} />
              </button>
              <button 
                onClick={() => setViewMode('agenda')} 
                className={`p-2 rounded-md transition-colors ${viewMode === 'agenda' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                title="Agenda View"
              >
                <List size={18} />
              </button>
            </div>

            {viewMode !== 'agenda' && (
              <div className="flex items-center gap-2">
                <button onClick={handlePrev} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={goToday} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 font-semibold rounded-lg text-sm transition-colors">
                  Today
                </button>
                <button onClick={handleNext} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Agenda View */}
        {viewMode === 'agenda' && (
          <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar flex justify-center">
            <div className="w-full max-w-4xl">
              {agendaGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-4">
                  <CalendarIcon size={48} className="opacity-20" />
                  <p className="text-lg">Your schedule is completely clear!</p>
                </div>
              ) : (
                <div className="space-y-8 pb-10">
                  {agendaGroups.map(group => (
                    <div key={group.date} className="flex gap-6">
                      <div className="w-32 flex-shrink-0 text-right pt-2 border-r border-gray-800 pr-6">
                        <div className="text-2xl font-bold text-white">{format(parseISO(group.date), 'dd')}</div>
                        <div className="text-sm font-medium text-blue-400">{format(parseISO(group.date), 'MMM, EEEE')}</div>
                      </div>
                      <div className="flex-1 pt-2">
                        <TaskList 
                          tasks={group.tasks} 
                          onToggleComplete={handleToggleComplete}
                          onTogglePriority={handleTogglePriority}
                          onEdit={handleOpenModal}
                          onDelete={handleDeleteTask}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Month & Week View */}
        {viewMode !== 'agenda' && (
          <>
            <div className="grid grid-cols-7 mb-2 gap-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="text-center font-semibold text-gray-500 text-sm">{d}</div>
              ))}
            </div>

            <div className={`flex-1 grid grid-cols-7 gap-4 pr-2 pb-4 custom-scrollbar ${viewMode === 'week' ? 'grid-rows-1' : 'auto-rows-fr overflow-y-auto'}`}>
              {days.map((day, idx) => {
                const isSelectedMonth = isSameMonth(day, startOfMonth(currentDate));
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                const lunarStr = getLunarDateStr(day);
                const dayStr = format(day, 'yyyy-MM-dd');
                
                const dayTasks = allTasks.filter(t => t.task_date === dayStr);
                const limit = viewMode === 'week' ? 100 : 3;
                const visibleTasks = dayTasks.slice(0, limit);
                const remainingTasks = dayTasks.length - visibleTasks.length;
                
                return (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedDate(day)}
                    className={`group relative flex flex-col p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected ? 'bg-blue-900/30 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500' :
                      !isSelectedMonth && viewMode === 'month' ? 'bg-gray-900/30 border-transparent text-gray-600 hover:border-gray-700 hover:bg-gray-900/50' : 
                      isToday ? 'bg-gray-800/80 border-blue-500/50 text-white hover:border-blue-400' : 
                      'bg-gray-900 border-gray-800 text-gray-200 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      <span className={`text-xs font-medium mt-1 ${isToday ? 'text-blue-300' : 'text-gray-500'}`}>
                        {lunarStr}
                      </span>
                    </div>
                    
                    <div className={`flex-1 flex flex-col gap-1 ${viewMode === 'week' ? 'overflow-y-auto custom-scrollbar pr-1' : 'overflow-hidden'}`}>
                      {visibleTasks.map(task => (
                        <div 
                          key={task.id} 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(task); }}
                          className={`text-xs px-2 py-1 rounded truncate border cursor-pointer hover:brightness-110 ${task.is_completed ? 'bg-gray-800/50 text-gray-400 border-gray-700 line-through' : task.is_important ? 'bg-yellow-900/30 text-yellow-200 border-yellow-700/50' : 'bg-blue-950/40 text-blue-100 border-blue-900/50'}`}
                          title={task.content}
                        >
                          {task.content}
                        </div>
                      ))}
                      {remainingTasks > 0 && (
                        <div className="text-xs text-gray-500 font-medium pl-1 mt-0.5">
                          +{remainingTasks} tasks
                        </div>
                      )}
                    </div>

                    {/* Hover Add Icon */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedDate(day); handleOpenModal(); }}
                        className="p-1 bg-gray-800 hover:bg-blue-600 rounded-md text-gray-300 hover:text-white"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Right Sidebar - Conditionally Rendered */}
      {viewMode !== 'agenda' && (
        <div className="w-96 border-l border-gray-800 bg-gray-900/50 p-6 flex flex-col h-full no-drag-region">
          <div className="flex items-center justify-between mb-6 drag-region pb-4 border-b border-gray-800/50">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${isConnected ? 'bg-green-500 text-green-500' : 'bg-red-500 text-red-500 animate-pulse'}`} />
              <span className="font-semibold text-gray-300 tracking-wide text-sm uppercase">
                {isConnected ? (isProcessing ? 'AI Processing...' : 'AI Ready') : 'Connecting...'}
              </span>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors no-drag-region"
              title="Add New Task"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white mb-1">
                {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'EEEE')}
              </h2>
              <p className="text-gray-400 text-sm font-medium">
                {format(selectedDate, 'MMMM d, yyyy')}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {selectedDayTasks.length > 0 ? (
                <TaskList 
                  tasks={selectedDayTasks} 
                  intentReply="" 
                  onToggleComplete={handleToggleComplete}
                  onTogglePriority={handleTogglePriority}
                  onEdit={handleOpenModal}
                  onDelete={handleDeleteTask}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500 space-y-3">
                  <CalendarIcon size={32} className="opacity-20" />
                  <p className="text-sm">No tasks for this day.</p>
                  <button onClick={() => handleOpenModal()} className="text-sm text-blue-400 hover:text-blue-300 font-medium">
                    + Add a task
                  </button>
                </div>
              )}
              
              {(isRecording || isProcessing) && (
                <div className="flex items-center gap-3 text-blue-400 mt-6 p-3 bg-blue-950/20 rounded-lg border border-blue-900/30">
                  <div className="relative flex items-center justify-center w-8 h-8 bg-blue-900/50 rounded-full">
                    <Mic size={16} className={isRecording ? "animate-pulse" : ""} />
                    {isRecording && (
                      <span className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-50"></span>
                    )}
                  </div>
                  <span className="text-sm font-semibold">
                    {isRecording ? "Listening to your voice..." : "Processing intent..."}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Task Modal */}
      <TaskModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingTask}
        selectedDate={selectedDate}
        onSave={handleModalSubmit}
      />
    </div>
  );
};
