export type ExerciseType = 'strength' | 'cardio';

export type MuscleGroup = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core' | 'Full Body' | 'Cardio';

export interface ExerciseDef {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  type: ExerciseType;
  isCustom: boolean;
}

export interface SetEntry {
  id: string;
  weight?: number; // lbs
  reps?: number;
  completed: boolean;
  // Cardio specific
  timeMinutes?: number;
  distanceKm?: number;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: SetEntry[];
}

export interface WorkoutDay {
  date: string; // YYYY-MM-DD
  exercises: WorkoutExercise[];
  completed: boolean;
  name?: string; // Custom name for the workout (e.g., "Leg Day")
}

export type ThemeMode = 'light' | 'dark' | 'amoled';

export interface AppState {
  workouts: Record<string, WorkoutDay>; // Keyed by date YYYY-MM-DD
  exercises: ExerciseDef[];
  theme: ThemeMode;
}