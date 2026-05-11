import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PracticePlan, DayOfWeek } from '../types';

interface PracticeState {
  currentPlan: PracticePlan | null;
  planHistory: PracticePlan[];
  isGenerating: boolean;
  generationError: string | null;
  setPlan: (plan: PracticePlan) => void;
  markDrillComplete: (day: DayOfWeek, drillId: string) => void;
  setGenerating: (val: boolean) => void;
  setGenerationError: (err: string | null) => void;
  clearPlan: () => void;
}

export const usePracticeStore = create<PracticeState>()(
  persist(
    (set, get) => ({
      currentPlan: null,
      planHistory: [],
      isGenerating: false,
      generationError: null,
      setPlan: (plan) => {
        const current = get().currentPlan;
        set((state) => ({
          currentPlan: plan,
          planHistory: current
            ? [current, ...state.planHistory].slice(0, 10)
            : state.planHistory,
        }));
      },
      markDrillComplete: (day, drillId) => {
        const plan = get().currentPlan;
        if (!plan) return;
        const days = plan.days.map((d) => {
          if (d.day !== day) return d;
          const already = d.completedDrillIds.includes(drillId);
          return {
            ...d,
            completedDrillIds: already
              ? d.completedDrillIds.filter((id) => id !== drillId)
              : [...d.completedDrillIds, drillId],
          };
        });
        set({ currentPlan: { ...plan, days } });
      },
      setGenerating: (val) => set({ isGenerating: val }),
      setGenerationError: (err) => set({ generationError: err }),
      clearPlan: () => set({ currentPlan: null }),
    }),
    {
      name: 'practice-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
