import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, ClubEntry } from '../types';
import { GolferFingerprint } from '../types/diagnostic';

const DEFAULT_BAG: ClubEntry[] = [
  { club: 'Driver', carryYards: 230 },
  { club: '3 Wood', carryYards: 210 },
  { club: '5 Wood', carryYards: 195 },
  { club: '4 Hybrid', carryYards: 185 },
  { club: '5 Iron', carryYards: 170 },
  { club: '6 Iron', carryYards: 160 },
  { club: '7 Iron', carryYards: 150 },
  { club: '8 Iron', carryYards: 140 },
  { club: '9 Iron', carryYards: 130 },
  { club: 'PW', carryYards: 120 },
  { club: '52°', carryYards: 105 },
  { club: '56°', carryYards: 90 },
  { club: '60°', carryYards: 75 },
];

interface UserState {
  profile: UserProfile | null;
  fingerprint: GolferFingerprint | null;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateClub: (club: string, carryYards: number) => void;
  completeOnboarding: () => void;
  setFingerprint: (fp: GolferFingerprint) => void;
  clearFingerprint: () => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      fingerprint: null,
      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) => {
        const current = get().profile;
        if (current) set({ profile: { ...current, ...updates } });
      },
      updateClub: (club, carryYards) => {
        const current = get().profile;
        if (!current) return;
        const bag = current.bag ?? DEFAULT_BAG;
        const updated = bag.map((c) => c.club === club ? { ...c, carryYards } : c);
        set({ profile: { ...current, bag: updated } });
      },
      completeOnboarding: () => {
        const current = get().profile;
        if (current) set({ profile: { ...current, hasCompletedOnboarding: true } });
      },
      setFingerprint: (fp) => set({ fingerprint: fp }),
      clearFingerprint: () => set({ fingerprint: null }),
      clearProfile: () => set({ profile: null, fingerprint: null }),
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export { DEFAULT_BAG };
