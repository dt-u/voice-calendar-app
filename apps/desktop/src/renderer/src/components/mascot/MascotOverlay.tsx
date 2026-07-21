import React, { useState, useEffect, useCallback } from 'react';
import { MascotState } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { Mascot } from './Mascot';

export const MascotOverlay: React.FC = () => {
  const [mascotState, setMascotState] = useState<MascotState>('IDLE');
  const { playAudio } = useAudioPlayer();

  const handleAudioReceived = useCallback((audioData: ArrayBuffer) => {
    setMascotState('SPEAKING');
    playAudio(audioData, () => {
      setMascotState('IDLE');
    });
  }, [playAudio]);

  const { isConnected, sendVoice } = useWebSocket(
    handleAudioReceived,
    setMascotState
  );

  const handleVoiceReady = useCallback((blob: Blob) => {
    sendVoice(blob);
  }, [sendVoice]);

  const { isRecording, startRecording, stopRecording } = useVoiceRecorder(handleVoiceReady);

  useEffect(() => {
    console.log('Current Mascot State:', mascotState);
  }, [mascotState]);

  useEffect(() => {
    const api = (window as any).api;
    if (api) {
      api.onSttStart(() => {
        if (!isRecording) {
          setMascotState('LISTENING');
          startRecording();
        }
      });

      api.onSttStop(() => {
        if (isRecording) {
          stopRecording();
        }
      });

      return () => {
        api.removeSttListeners();
      };
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full pointer-events-none p-4">
      <div className="pointer-events-auto">
        {!isConnected && (
          <div className="absolute top-2 left-2 bg-red-500/80 text-white text-xs px-2 py-1 rounded-full animate-pulse no-drag-region">
            Offline
          </div>
        )}
        <Mascot state={mascotState} />
      </div>
    </div>
  );
};
