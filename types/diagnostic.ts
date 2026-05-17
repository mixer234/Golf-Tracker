export type GolferTier = 'beginner' | 'mid' | 'competitive';

export type DiagnosticInputType =
  | 'text'
  | 'chips'
  | 'mixed'
  | 'visual_grid'
  | 'visual_clubs'
  | 'visual_putting'
  | 'visual_yardage';

export interface DiagnosticQuestion {
  id: string;
  phase: 1 | 2 | 3 | 4;
  text: string;
  inputType: DiagnosticInputType;
  chipOptions?: string[];
  multiSelect?: boolean;
  skippable?: boolean;
  area?: string;
  placeholder?: string;
  visualConfig?: Record<string, unknown>;
}

export interface ConversationEntry {
  id: string;
  question: string;
  displayAnswer: string;
  answerChips?: string[];
  answerText?: string;
  answerVisual?: unknown;
  inputType: DiagnosticInputType;
}

export interface GolferFingerprint {
  tier: GolferTier;
  completedAt: string;
  seriousnessLevel: string;
  practiceHoursPerWeek: number;
  driverProfile: {
    issues: string[];
    typicalMiss: string | null;
    missShape: string | null;
    confidenceLevel: 'low' | 'medium' | 'high';
  };
  ironProfile: {
    issues: string[];
    problemClubs: string[];
    missPattern: string[];
    distanceControl: 'poor' | 'ok' | 'good';
    confidenceLevel: 'low' | 'medium' | 'high';
  };
  wedgeProfile: {
    issues: string[];
    uncomfortableDistanceRange: { from: number; to: number } | null;
    bunkerConfidence: 'low' | 'medium' | 'high';
    partialShotControl: 'poor' | 'ok' | 'good';
  };
  puttingProfile: {
    issues: string[];
    missPattern: string[];
    problemDistances: string[];
    pressurePutting: 'strength' | 'neutral' | 'weakness';
    speedControl: 'poor' | 'ok' | 'good';
    confidenceLevel: 'low' | 'medium' | 'high';
  };
  shortGameProfile: {
    issues: string[];
    problemLies: string[];
    chippingConsistency: 'poor' | 'ok' | 'good';
  };
  mentalProfile: {
    issues: string[];
    pressureResponse: 'improves' | 'neutral' | 'declines' | 'unknown';
    specificFears: string[];
    angerManagement: 'issue' | 'neutral' | 'strength';
  };
  courseManagement: {
    issues: string[];
    tendencies: string[];
  };
  priorityAreas: string[];
  keyInsights: string;
  coachingApproach: string;
}
