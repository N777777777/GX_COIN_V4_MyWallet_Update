import { useCallback } from 'react';
import clickSound from '@/assets/assets_sounds_click.mp3';

export const useClickSound = () => {
  const playSound = useCallback(() => {
    // Check if sound is enabled from localStorage
    const soundEnabled = localStorage.getItem('sound_enabled') !== 'false';
    if (!soundEnabled) return;
    
    try {
      const audio = new Audio(clickSound);
      audio.volume = 0.3; // Set volume to 30%
      audio.play().catch(err => {
        console.log('Could not play sound:', err);
      });
    } catch (err) {
      console.log('Sound not available:', err);
    }
  }, []);

  return { playSound };
};