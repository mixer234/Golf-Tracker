import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course, CourseHole, TeeColor } from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function buildEmptyCourseHoles(): CourseHole[] {
  return Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1,
    par: 4 as const,
    strokeIndex: i + 1,
    yardages: {},
    name: undefined,
  }));
}

interface CourseState {
  courses: Course[];
  addCourse: (data: Omit<Course, 'id' | 'createdAt' | 'holes'>) => string;
  updateCourse: (id: string, updates: Partial<Omit<Course, 'id' | 'holes'>>) => void;
  updateHole: (courseId: string, holeNumber: number, data: Partial<CourseHole>) => void;
  deleteCourse: (id: string) => void;
  getCourse: (id: string) => Course | undefined;
}

export const useCourseStore = create<CourseState>()(
  persist(
    (set, get) => ({
      courses: [],

      addCourse: (data) => {
        const id = generateId();
        const course: Course = {
          ...data,
          id,
          createdAt: new Date().toISOString(),
          holes: buildEmptyCourseHoles(),
        };
        set((state) => ({ courses: [...state.courses, course] }));
        return id;
      },

      updateCourse: (id, updates) =>
        set((state) => ({
          courses: state.courses.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      updateHole: (courseId, holeNumber, data) =>
        set((state) => ({
          courses: state.courses.map((c) =>
            c.id === courseId
              ? {
                  ...c,
                  holes: c.holes.map((h) =>
                    h.holeNumber === holeNumber ? { ...h, ...data } : h
                  ),
                }
              : c
          ),
        })),

      deleteCourse: (id) =>
        set((state) => ({ courses: state.courses.filter((c) => c.id !== id) })),

      getCourse: (id) => get().courses.find((c) => c.id === id),
    }),
    {
      name: 'course-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
