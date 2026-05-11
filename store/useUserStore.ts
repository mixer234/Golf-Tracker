import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, WeaknessArea, GoalType } from '../types';

interface UserState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) => {
        const current = get().profile;
        if (current) set({ profile: { ...current, ...updates } });
      },
      completeOnboarding: () => {
        const current = get().profile;
        if (current) set({ profile: { ...current, hasCompletedOnboarding: true } });
      },
      clearProfile: () => set({ profile: null }),
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
