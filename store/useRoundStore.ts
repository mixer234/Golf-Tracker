import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Round, HoleScore, RoundType, TeeColor } from '../types';
import { calcScoreDifferential } from '../utils/whs';
import { calcRoundSG } from '../utils/strokesGained';

interface RoundState {
  rounds: Round[];
  currentRound: Round | null;
  lastCompletedRound: Round | null;
  startRound: (
    courseName: string,
    courseRating?: number,
    slopeRating?: number,
    roundType?: RoundType,
    courseId?: string,
    teeColor?: TeeColor,
    holePars?: { holeNumber: number; par: 3 | 4 | 5 }[],
    holeDistances?: { holeNumber: number; distanceYards: number }[],
    holeCount?: 9 | 18,
    date?: string,
  ) => void;
  updateRound: (id: string, updates: Partial<Round>) => void;
  updateHole: (holeNumber: number, data: Partial<HoleScore>) => void;
  completeRound: () => void;
  discardCurrentRound: () => void;
  deleteRound: (id: string) => void;
  clearLastCompleted: () => void;
  updateRoundNotes: (id: string, notes: string) => void;
  recalcAndSaveRound: (id: string, holes: HoleScore[]) => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function buildEmptyHoles(count: 9 | 18 = 18): HoleScore[] {
  return Array.from({ length: count }, (_, i) => ({
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
      startRound: (courseName, courseRating, slopeRating, roundType, courseId, teeColor, holePars, holeDistances, holeCount, date) => {
        const baseHoles = buildEmptyHoles(holeCount ?? 18);
        const holes = baseHoles.map((h) => {
          const parMatch = holePars?.find((p) => p.holeNumber === h.holeNumber);
          const distMatch = holeDistances?.find((d) => d.holeNumber === h.holeNumber);
          return {
            ...h,
            ...(parMatch ? { par: parMatch.par } : {}),
            ...(distMatch ? { holeDistanceYards: distMatch.distanceYards } : {}),
          };
        });
        const round: Round = {
          id: generateId(),
          date: date && !isNaN(Date.parse(date)) ? new Date(date).toISOString() : new Date().toISOString(),
          courseName,
          courseRating,
          slopeRating,
          roundType,
          courseId,
          teeColor,
          holes,
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
        // Only persist a category value if at least one hole contributed to it,
        // so the UI can show "—" instead of a misleading 0.00 for missing data.
        const completed: Round = {
          ...current,
          ...stats,
          scoreDifferential,
          sgPutting: sg && sg.holesWithPutting > 0 ? sg.sgPutting : undefined,
          sgApproach: sg && sg.holesWithApproach > 0 ? sg.sgApproach : undefined,
          sgAroundGreen: sg && sg.holesWithAroundGreen > 0 ? sg.sgAroundGreen : undefined,
          sgOffTee: sg && sg.holesWithOffTee > 0 ? sg.sgOffTee : undefined,
          sgTotal: sg ? sg.sgTotal : undefined,
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
      recalcAndSaveRound: (id, holes) => {
        const round = get().rounds.find((r) => r.id === id);
        if (!round) return;
        const stats = calcRoundStats(holes);
        let scoreDifferential: number | undefined;
        if (round.courseRating && round.slopeRating && stats.totalScore > 0) {
          scoreDifferential = calcScoreDifferential(stats.totalScore, round.courseRating, round.slopeRating);
        }
        const sg = calcRoundSG(holes);
        const updated: Round = {
          ...round,
          holes,
          ...stats,
          scoreDifferential,
          sgPutting: sg && sg.holesWithPutting > 0 ? sg.sgPutting : undefined,
          sgApproach: sg && sg.holesWithApproach > 0 ? sg.sgApproach : undefined,
          sgAroundGreen: sg && sg.holesWithAroundGreen > 0 ? sg.sgAroundGreen : undefined,
          sgOffTee: sg && sg.holesWithOffTee > 0 ? sg.sgOffTee : undefined,
          sgTotal: sg ? sg.sgTotal : undefined,
        };
        set((state) => ({
          rounds: state.rounds.map((r) => r.id === id ? updated : r),
          lastCompletedRound: state.lastCompletedRound?.id === id ? updated : state.lastCompletedRound,
        }));
      },
    }),
    {
      name: 'round-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
