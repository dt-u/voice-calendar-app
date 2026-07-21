import { useRef, useCallback } from 'react';

export const useAudioPlayer = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playAudio = useCallback(async (audioData: ArrayBuffer, onEnded?: () => void) => {
    try {
      initAudioContext();
      const ctx = audioContextRef.current!;

      // User required: must check and call resume() before decode/play 
      // to bypass Chrome/Electron autoplay policy.
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const audioBuffer = await ctx.decodeAudioData(audioData);
      
      const sourceNode = ctx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(ctx.destination);
      
      sourceNode.onended = () => {
        if (onEnded) onEnded();
      };

      sourceNodeRef.current = sourceNode;
      sourceNode.start(0);
    } catch (err) {
      console.error('Failed to play audio:', err);
      if (onEnded) onEnded();
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
  }, []);

  return { playAudio, stopAudio };
};
