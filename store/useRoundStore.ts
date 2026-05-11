import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Round, HoleScore } from '../types';

interface RoundState {
  rounds: Round[];
  currentRound: Round | null;
  startRound: (courseName: string) => void;
  updateHole: (holeNumber: number, data: Partial<HoleScore>) => void;
  completeRound: () => void;
  discardCurrentRound: () => void;
  deleteRound: (id: string) => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function buildEmptyHoles(): HoleScore[] {
  return Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1,
    par: 4 as const,
    strokes: 0,
    putts: 0,
    fairwayHit: undefined,
    greenInRegulation: false,
  }));
}

function calcRoundStats(holes: HoleScore[]) {
  const completed = holes.filter((h) => h.strokes > 0);
  const totalScore = completed.reduce((sum, h) => sum + h.strokes, 0);
  const totalPar = completed.reduce((sum, h) => sum + h.par, 0);
  const totalPutts = completed.reduce((sum, h) => sum + h.putts, 0);
  const par45 = completed.filter((h) => h.par === 4 || h.par === 5);
  const fairwaysHit = par45.filter((h) => h.fairwayHit === true).length;
  const greensInRegulation = completed.filter((h) => h.greenInRegulation).length;
  return {
    totalScore,
    scoreToPar: totalScore - totalPar,
    totalPutts,
    fairwaysHit,
    fairwaysTotal: par45.length,
    greensInRegulation,
  };
}

export const useRoundStore = create<RoundState>()(
  persist(
    (set, get) => ({
      rounds: [],
      currentRound: null,
      startRound: (courseName) => {
        const round: Round = {
          id: generateId(),
          date: new Date().toISOString(),
          courseName,
          holes: buildEmptyHoles(),
          totalScore: 0,
          scoreToPar: 0,
          totalPutts: 0,
          fairwaysHit: 0,
          fairwaysTotal: 0,
          greensInRegulation: 0,
          isComplete: false,
        };
        set({ currentRound: round });
      },
      updateHole: (holeNumber, data) => {
        const current = get().currentRound;
        if (!current) return;
        const holes = current.holes.map((h) =>
          h.holeNumber === holeNumber ? { ...h, ...data } : h
        );
        set({ currentRound: { ...current, holes } });
      },
      completeRound: () => {
        const current = get().currentRound;
        if (!current) return;
        const stats = calcRoundStats(current.holes);
        const completed: Round = { ...current, ...stats, isComplete: true };
        set((state) => ({
          rounds: [completed, ...state.rounds],
          currentRound: null,
        }));
      },
      discardCurrentRound: () => set({ currentRound: null }),
      deleteRound: (id) =>
        set((state) => ({ rounds: state.rounds.filter((r) => r.id !== id) })),
    }),
    {
      name: 'round-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
