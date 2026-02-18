import { AppState, ExerciseDef, WorkoutDay } from '../types';
import { INITIAL_EXERCISES } from '../constants';

const STORAGE_KEY = 'liftlog_data_v1';

// Fallback constant in case import fails or is empty
const SAFE_INITIAL_EXERCISES: ExerciseDef[] = INITIAL_EXERCISES && INITIAL_EXERCISES.length > 0 
  ? INITIAL_EXERCISES 
  : [
      { id: 'bp', name: 'Barbell Bench Press', muscleGroup: 'Chest', type: 'strength', isCustom: false },
      { id: 'sq', name: 'Barbell Squat', muscleGroup: 'Legs', type: 'strength', isCustom: false },
      { id: 'dl', name: 'Deadlift', muscleGroup: 'Back', type: 'strength', isCustom: false },
      { id: 'ohp', name: 'Overhead Press', muscleGroup: 'Shoulders', type: 'strength', isCustom: false },
      { id: 'run', name: 'Running', muscleGroup: 'Cardio', type: 'cardio', isCustom: false },
    ];

const DEFAULT_STATE: AppState = {
  workouts: {},
  exercises: SAFE_INITIAL_EXERCISES,
  theme: 'dark',
};

export const loadState = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const loaded = JSON.parse(raw);
    
    // Validate exercises
    const exercises = (Array.isArray(loaded.exercises) && loaded.exercises.length > 0) 
        ? loaded.exercises 
        : SAFE_INITIAL_EXERCISES;

    // Merge loaded state with defaults to ensure all fields exist
    return {
      ...DEFAULT_STATE,
      ...loaded,
      workouts: loaded.workouts || {},
      exercises: exercises,
      theme: loaded.theme || 'dark'
    };
  } catch (e) {
    console.error("Failed to load state", e);
    return DEFAULT_STATE;
  }
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
};

export const resetStorage = () => {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_STATE;
}

// Helper to generate IDs
export const generateId = () => Math.random().toString(36).substring(2, 9);