import React, { useState, useEffect, useCallback } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from 'date-fns';
import lunar from 'lunar-javascript';
const { Solar, Lunar } = lunar;
import { TaskList } from '../widgets/TaskList';
import { QuickInput } from '../widgets/QuickInput';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Mic } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';

export const CalendarDashboard: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Quick hack: mock websocket connection for now, backend could provide actual task sync later
  const noop1 = useCallback(() => {}, []);
  const noop2 = useCallback(() => {}, []);

  const { isConnected, metadata, sendText, sendVoice } = useWebSocket(
    noop1, 
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
        console.log('STT_START received in UI! isRecording:', isRecording);
        if (!isRecording) startRecording();
      });

      api.onSttStop(() => {
        console.log('STT_STOP received in UI! isRecording:', isRecording);
        if (isRecording) stopRecording();
      });

      return () => {
        api.removeSttListeners();
      };
    }
  }, [isRecording, startRecording, stopRecording]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "d";
  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  // Lịch Âm helper
  const getLunarDateStr = (date: Date) => {
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const lunar = Lunar.fromSolar(solar);
    // If it's the 1st of lunar month, show month too
    if (lunar.getDay() === 1) {
      return `${lunar.getDay()}/${lunar.getMonth()}`;
    }
    return `${lunar.getDay()}`;
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden pointer-events-auto">
      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col p-8 no-drag-region">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 drag-region">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {format(currentDate, "MMMM yyyy")}
              </h1>
              <p className="text-gray-400 text-sm font-medium">Voice Calendar Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-drag-region">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 font-semibold rounded-lg text-sm transition-colors">
              Today
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 mb-2 gap-4">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="text-center font-semibold text-gray-500 text-sm">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 gap-4 auto-rows-fr">
          {days.map((day, idx) => {
            const isSelectedMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            const lunarStr = getLunarDateStr(day);
            
            return (
              <div 
                key={idx} 
                className={`relative flex flex-col p-3 rounded-2xl border transition-all hover:border-gray-600 cursor-pointer ${
                  !isSelectedMonth ? 'bg-gray-900/30 border-transparent text-gray-600' : 
                  isToday ? 'bg-blue-900/20 border-blue-500/50 text-white' : 
                  'bg-gray-900 border-gray-800 text-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-lg font-bold ${isToday ? 'text-blue-400' : ''}`}>
                    {format(day, dateFormat)}
                  </span>
                  {/* Âm Lịch */}
                  <span className={`text-xs font-medium ${isToday ? 'text-blue-300' : 'text-gray-500'}`}>
                    {lunarStr}
                  </span>
                </div>
                {/* Tasks for the day can be mapped here later */}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Sidebar - Widgets */}
      <div className="w-96 border-l border-gray-800 bg-gray-900/50 p-6 flex flex-col gap-6 no-drag-region">
        <div className="flex items-center gap-3 mb-2 drag-region">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
          <span className="font-semibold text-gray-300">{isConnected ? 'AI Engine Online' : 'Connecting...'}</span>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <h2 className="text-lg font-bold">Tasks & Output</h2>
          <TaskList tasks={metadata?.tasks || []} intentReply={metadata?.reply_text || "No recent activity. Hold Alt to speak."} />
          {isRecording && (
            <div className="flex items-center gap-2 text-red-400 mt-2">
              <Mic className="animate-pulse" size={16} />
              <span className="text-sm font-semibold">Recording...</span>
            </div>
          )}
        </div>

        <div className="mt-auto">
          <QuickInput onSubmit={sendText} isRecording={false} />
        </div>
      </div>
    </div>
  );
};
