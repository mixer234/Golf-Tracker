export type WeaknessArea =
  | 'driving'
  | 'long_irons'
  | 'mid_irons'
  | 'short_irons'
  | 'wedges'
  | 'bunkers'
  | 'putting'
  | 'chipping'
  | 'mental'
  | 'course_management';

export type GoalType =
  | 'lower_handicap'
  | 'consistency'
  | 'tournament_prep'
  | 'enjoyment'
  | 'course_management'
  | 'fitness';

export type ExperienceLevel = 'beginner' | 'casual' | 'dedicated' | 'competitive';

export type PracticeFacility =
  | 'driving_range'
  | 'putting_green'
  | 'chipping_area'
  | 'full_course'
  | 'simulator'
  | 'home_net';

export type MissTendency =
  | 'slice'
  | 'hook'
  | 'fat_chunk'
  | 'thin_top'
  | 'three_putts'
  | 'distance_control'
  | 'sand_struggles'
  | 'pressure_nerves'
  | 'inconsistent_contact'
  | 'pull_left'
  | 'push_right';

export type TargetTimeline = '3_months' | '6_months' | '1_year' | 'no_rush';

export type MissDirection =
  | 'long-left' | 'long' | 'long-right'
  | 'left' | 'center' | 'right'
  | 'short-left' | 'short' | 'short-right';

export type RoundType = 'casual' | 'competitive' | 'tournament';

export type TeeColor = 'black' | 'blue' | 'white' | 'red' | 'gold';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export type ShotShape = 'draw' | 'fade' | 'straight' | 'varies';

export interface ClubEntry {
  club: string;
  carryYards: number;
}

export interface UserProfile {
  name: string;
  experienceLevel: ExperienceLevel;
  handicap: number;
  targetHandicap: number;
  targetTimeline: TargetTimeline;
  weaknesses: WeaknessArea[];
  strengths: WeaknessArea[];
  missTendencies: MissTendency[];
  goals: GoalType[];
  ballSpeed?: number;
  avgDrivingDistance?: number;
  shotShape?: ShotShape;
  bag?: ClubEntry[];
  practiceDaysPerWeek: number;
  sessionLengthMinutes: number;
  facilities: PracticeFacility[];
  hasCompletedOnboarding: boolean;
  apiKey: string;
  createdAt: string;
  advancedStatsMode?: boolean;
}

export interface HoleScore {
  holeNumber: number;
  par: 3 | 4 | 5;
  strokes: number;
  putts: number;
  fairwayHit?: boolean;
  greenInRegulation: boolean;
  penaltyStrokes?: number;
  upAndDown?: boolean;
  sandSave?: boolean;
  // Strokes Gained inputs
  holeDistanceYards?: number;
  approachDistanceYards?: number;
  approachLie?: 'fairway' | 'rough' | 'sand' | 'recovery';
  firstPuttDistanceFeet?: number;
  proximityFeet?: number;
  missDirection?: MissDirection;
}

export interface Round {
  id: string;
  date: string;
  courseName: string;
  courseRating?: number;
  slopeRating?: number;
  holes: HoleScore[];
  totalScore: number;
  scoreToPar: number;
  totalPutts: number;
  fairwaysHit: number;
  fairwaysTotal: number;
  greensInRegulation: number;
  totalPenalties: number;
  upAndDowns: number;
  upAndDownAttempts: number;
  scoreDifferential?: number;
  notes?: string;
  roundType?: RoundType;
  courseId?: string;
  teeColor?: TeeColor;
  mentalCommitment?: number;
  mentalControl?: number;
  mentalDecisions?: number;
  mentalEnergy?: number;
  // Strokes Gained (per round totals)
  sgPutting?: number;
  sgApproach?: number;
  sgAroundGreen?: number;
  sgOffTee?: number;
  sgTotal?: number;
  isComplete: boolean;
}

export interface Drill {
  id: string;
  name: string;
  description: string;
  duration: number;
  category: WeaknessArea;
  difficulty: DifficultyLevel;
  equipment: string[];
  instructions: string[];
  focusPoints: string[];
}

export interface DailyPlan {
  day: DayOfWeek;
  duration: number;
  theme: string;
  drills: Drill[];
  completedDrillIds: string[];
}

export interface PracticePlan {
  id: string;
  generatedAt: string;
  weekOf: string;
  focusAreas: WeaknessArea[];
  days: DailyPlan[];
  aiGenerated: boolean;
}

export interface PracticeSession {
  id: string;
  date: string;
  day: DayOfWeek;
  drillsCompleted: string[];
  totalDrills: number;
  durationSeconds: number;
}

export interface WeaknessOption {
  key: WeaknessArea;
  label: string;
  icon: string;
}

export interface GoalOption {
  key: GoalType;
  label: string;
  description: string;
}

export interface CourseHole {
  holeNumber: number;
  par: 3 | 4 | 5;
  strokeIndex: number; // 1–18, handicap allocation order
  yardages: Partial<Record<TeeColor, number>>;
  name?: string;
}

export interface Course {
  id: string;
  name: string;
  city?: string;
  courseRating?: number;
  slopeRating?: number;
  defaultTee: TeeColor;
  holes: CourseHole[];
  createdAt: string;
}

// ─── Swing Vault ─────────────────────────────────────────────────────────────

export type SwingClub =
  | 'driver'
  | 'fairway_wood'
  | 'hybrid'
  | 'long_iron'
  | 'mid_iron'
  | 'short_iron'
  | 'wedge'
  | 'chipper'
  | 'putter';

export interface SwingVideo {
  id: string;
  title: string;
  uri: string;
  thumbnailUri?: string;
  durationSeconds: number;
  club: SwingClub;
  date: string;
  notes?: string;
  slowMo: boolean;
}
