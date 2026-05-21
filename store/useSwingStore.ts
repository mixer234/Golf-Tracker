import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SwingVideo, SwingClub } from '../types';

export const FREE_TIER_LIMIT = 5;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface SwingState {
  swings: SwingVideo[];
  addSwing: (video: Omit<SwingVideo, 'id' | 'date'>) => void;
  deleteSwing: (id: string) => void;
  renameSwing: (id: string, title: string) => void;
  updateClub: (id: string, club: SwingClub) => void;
  updateNotes: (id: string, notes: string) => void;
}

export const useSwingStore = create<SwingState>()(
  persist(
    (set) => ({
      swings: [],
      addSwing: (video) =>
        set((state) => ({
          swings: [
            { ...video, id: generateId(), date: new Date().toISOString() },
            ...state.swings,
          ],
        })),
      deleteSwing: (id) =>
        set((state) => ({ swings: state.swings.filter((s) => s.id !== id) })),
      renameSwing: (id, title) =>
        set((state) => ({
          swings: state.swings.map((s) => (s.id === id ? { ...s, title } : s)),
        })),
      updateClub: (id, club) =>
        set((state) => ({
          swings: state.swings.map((s) => (s.id === id ? { ...s, club } : s)),
        })),
      updateNotes: (id, notes) =>
        set((state) => ({
          swings: state.swings.map((s) => (s.id === id ? { ...s, notes } : s)),
        })),
    }),
    {
      name: 'swing-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
