import { useState, useEffect, useRef, useCallback } from 'react';
import { ResponseMetadata, MascotState } from '../types';

export const useWebSocket = (
  onAudioReceived: (audioData: ArrayBuffer) => void,
  onStateChange: (state: MascotState) => void
) => {
  const [metadata, setMetadata] = useState<ResponseMetadata | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket('ws://127.0.0.1:8000/ws');
    
    ws.onopen = () => {
      console.log('Connected to AI Engine');
      setIsConnected(true);
      // Fetch all tasks on connect
      ws.send(JSON.stringify({ type: 'GET_ALL_TASKS' }));
    };

    ws.onclose = () => {
      console.log('Disconnected from AI Engine');
      setIsConnected(false);
      // Auto reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };

    ws.onmessage = async (event) => {
      // Handle Frame 2: Binary Audio Data
      if (event.data instanceof Blob) {
        const arrayBuffer = await event.data.arrayBuffer();
        onAudioReceived(arrayBuffer);
        return;
      }

      // Handle Frame 1: JSON Metadata
      if (typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data) as ResponseMetadata;
          if (data.type === 'RESPONSE_METADATA') {
            setMetadata(data);
            setIsProcessing(false);
            if (!data.has_audio) {
              // If there's no audio expected, return to IDLE after a short delay
              setTimeout(() => onStateChange('IDLE'), 3000);
            }
          }
        } catch (e) {
          console.error('Failed to parse WebSocket JSON:', e);
        }
      }
    };

    wsRef.current = ws;
  }, [onAudioReceived, onStateChange]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendText = useCallback((text: string) => {
    if (isProcessing) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsProcessing(true);
      onStateChange('THINKING');
      wsRef.current.send(JSON.stringify({ type: 'TEXT_INPUT', text }));
    }
  }, [isProcessing, onStateChange]);

  const sendVoice = useCallback(async (audioBlob: Blob) => {
    if (isProcessing) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsProcessing(true);
      onStateChange('THINKING');
      
      // The backend expects a raw binary frame for audio, not JSON.
      wsRef.current.send(audioBlob);
    }
  }, [isProcessing, onStateChange]);

  const sendManualTask = useCallback((taskDate: string, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'ADD_MANUAL_TASK', 
        task_date: taskDate,
        content 
      }));
    }
  }, []);

  const updateTask = useCallback((taskId: string, updates: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'UPDATE_TASK',
        task_id: taskId,
        updates
      }));
    }
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'DELETE_TASK',
        task_id: taskId
      }));
    }
  }, []);

  return { isConnected, isProcessing, metadata, sendText, sendVoice, sendManualTask, updateTask, deleteTask };
};
