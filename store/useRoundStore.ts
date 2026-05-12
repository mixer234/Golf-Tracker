import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Round, HoleScore, RoundType } from '../types';
import { calcScoreDifferential } from '../utils/whs';
import { calcRoundSG } from '../utils/strokesGained';

interface RoundState {
  rounds: Round[];
  currentRound: Round | null;
  lastCompletedRound: Round | null;
  startRound: (courseName: string, courseRating?: number, slopeRating?: number, roundType?: RoundType) => void;
  updateRound: (id: string, updates: Partial<Round>) => void;
  updateHole: (holeNumber: number, data: Partial<HoleScore>) => void;
  completeRound: () => void;
  discardCurrentRound: () => void;
  deleteRound: (id: string) => void;
  clearLastCompleted: () => void;
  updateRoundNotes: (id: string, notes: string) => void;
  verifySave: (roundId: string) => Promise<boolean>;
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
    penaltyStrokes: 0,
    upAndDown: undefined,
    sandSave: undefined,
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
  const totalPenalties = completed.reduce((sum, h) => sum + (h.penaltyStrokes ?? 0), 0);
  const missedGreen = completed.filter((h) => !h.greenInRegulation);
  const upAndDowns = missedGreen.filter((h) => h.upAndDown === true).length;
  const upAndDownAttempts = missedGreen.filter((h) => h.upAndDown !== undefined).length;

  return {
    totalScore,
    scoreToPar: totalScore - totalPar,
    totalPutts,
    fairwaysHit,
    fairwaysTotal: par45.length,
    greensInRegulation,
    totalPenalties,
    upAndDowns,
    upAndDownAttempts,
  };
}

export const useRoundStore = create<RoundState>()(
  persist(
    (set, get) => ({
      rounds: [],
      currentRound: null,
      lastCompletedRound: null,
      startRound: (courseName, courseRating, slopeRating, roundType) => {
        const round: Round = {
          id: generateId(),
          date: new Date().toISOString(),
          courseName,
          courseRating,
          slopeRating,
          roundType,
          holes: buildEmptyHoles(),
          totalScore: 0,
          scoreToPar: 0,
          totalPutts: 0,
          fairwaysHit: 0,
          fairwaysTotal: 0,
          greensInRegulation: 0,
          totalPenalties: 0,
          upAndDowns: 0,
          upAndDownAttempts: 0,
          isComplete: false,
        };
        set({ currentRound: round });
      },
      updateRound: (id, updates) =>
        set((state) => ({
          rounds: state.rounds.map((r) => r.id === id ? { ...r, ...updates } : r),
          lastCompletedRound:
            state.lastCompletedRound?.id === id
              ? { ...state.lastCompletedRound, ...updates }
              : state.lastCompletedRound,
        })),
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
        let scoreDifferential: number | undefined;
        if (current.courseRating && current.slopeRating && stats.totalScore > 0) {
          scoreDifferential = calcScoreDifferential(
            stats.totalScore,
            current.courseRating,
            current.slopeRating
          );
        }
        const sg = calcRoundSG(current.holes);
        const completed: Round = {
          ...current,
          ...stats,
          scoreDifferential,
          sgPutting: sg?.sgPutting,
          sgApproach: sg?.sgApproach,
          sgAroundGreen: sg?.sgAroundGreen,
          sgOffTee: sg?.sgOffTee,
          sgTotal: sg?.sgTotal,
          isComplete: true,
        };
        set((state) => ({
          rounds: [completed, ...state.rounds],
          currentRound: null,
          lastCompletedRound: completed,
        }));
      },
      discardCurrentRound: () => set({ currentRound: null }),
      deleteRound: (id) =>
        set((state) => ({ rounds: state.rounds.filter((r) => r.id !== id) })),
      clearLastCompleted: () => set({ lastCompletedRound: null }),
      updateRoundNotes: (id, notes) =>
        set((state) => ({
          rounds: state.rounds.map((r) => r.id === id ? { ...r, notes } : r),
          lastCompletedRound:
            state.lastCompletedRound?.id === id
              ? { ...state.lastCompletedRound, notes }
              : state.lastCompletedRound,
        })),

      verifySave: async (roundId: string): Promise<boolean> => {
        try {
          const raw = await AsyncStorage.getItem('round-store');
          if (!raw) return false;
          const parsed = JSON.parse(raw);
          const rounds: Round[] = parsed?.state?.rounds ?? [];
          return rounds.some((r) => r.id === roundId);
        } catch (err) {
          console.error('[useRoundStore] verifySave failed:', err);
          return false;
        }
      },
    }),
    {
      name: 'round-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
