import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PracticePlan, DayOfWeek, PracticeSession } from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface PracticeState {
  currentPlan: PracticePlan | null;
  planHistory: PracticePlan[];
  isGenerating: boolean;
  generationError: string | null;
  sessions: PracticeSession[];
  // Active session (not persisted between app restarts)
  activeSessionDay: DayOfWeek | null;
  activeSessionStartTime: number | null;
  activeDrillIndex: number;
  setPlan: (plan: PracticePlan) => void;
  markDrillComplete: (day: DayOfWeek, drillId: string) => void;
  setGenerating: (val: boolean) => void;
  setGenerationError: (err: string | null) => void;
  clearPlan: () => void;
  startSession: (day: DayOfWeek) => void;
  nextDrill: () => void;
  endSession: (completedDrillIds: string[], totalDrills: number) => void;
  cancelSession: () => void;
}

export const usePracticeStore = create<PracticeState>()(
  persist(
    (set, get) => ({
      currentPlan: null,
      planHistory: [],
      isGenerating: false,
      generationError: null,
      sessions: [],
      activeSessionDay: null,
      activeSessionStartTime: null,
      activeDrillIndex: 0,

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

      startSession: (day) => {
        set({
          activeSessionDay: day,
          activeSessionStartTime: Date.now(),
          activeDrillIndex: 0,
        });
      },

      nextDrill: () => {
        set((state) => ({ activeDrillIndex: state.activeDrillIndex + 1 }));
      },

      endSession: (completedDrillIds, totalDrills) => {
        const { activeSessionDay, activeSessionStartTime } = get();
        if (!activeSessionDay || !activeSessionStartTime) return;

        const durationSeconds = Math.round((Date.now() - activeSessionStartTime) / 1000);
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;

        const session: PracticeSession = {
          id: generateId(),
          date: new Date().toISOString(),
          day: activeSessionDay,
          drillsCompleted: completedDrillIds,
          totalDrills,
          durationSeconds,
        };

        // Mark all completed drills in the plan
        completedDrillIds.forEach((id) => {
          get().markDrillComplete(activeSessionDay, id);
        });

        set((state) => ({
          sessions: [session, ...state.sessions].slice(0, 50),
          activeSessionDay: null,
          activeSessionStartTime: null,
          activeDrillIndex: 0,
        }));
      },

      cancelSession: () => {
        set({
          activeSessionDay: null,
          activeSessionStartTime: null,
          activeDrillIndex: 0,
        });
      },
    }),
    {
      name: 'practice-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentPlan: state.currentPlan,
        planHistory: state.planHistory,
        sessions: state.sessions,
        // Don't persist active session state
      }),
    }
  )
);
