import { ExerciseDef, MuscleGroup } from './types';

export const INITIAL_EXERCISES: ExerciseDef[] = [
  // Chest
  { id: 'bp', name: 'Barbell Bench Press', muscleGroup: 'Chest', type: 'strength', isCustom: false },
  { id: 'idbp', name: 'Incline Dumbbell Press', muscleGroup: 'Chest', type: 'strength', isCustom: false },
  { id: 'fly', name: 'Cable Fly', muscleGroup: 'Chest', type: 'strength', isCustom: false },
  // Back
  { id: 'dl', name: 'Deadlift', muscleGroup: 'Back', type: 'strength', isCustom: false },
  { id: 'pullup', name: 'Pull Up', muscleGroup: 'Back', type: 'strength', isCustom: false },
  { id: 'row', name: 'Barbell Row', muscleGroup: 'Back', type: 'strength', isCustom: false },
  // Legs
  { id: 'sq', name: 'Barbell Squat', muscleGroup: 'Legs', type: 'strength', isCustom: false },
  { id: 'lp', name: 'Leg Press', muscleGroup: 'Legs', type: 'strength', isCustom: false },
  { id: 'le', name: 'Leg Extension', muscleGroup: 'Legs', type: 'strength', isCustom: false },
  // Shoulders
  { id: 'ohp', name: 'Overhead Press', muscleGroup: 'Shoulders', type: 'strength', isCustom: false },
  { id: 'latraise', name: 'Lateral Raise', muscleGroup: 'Shoulders', type: 'strength', isCustom: false },
  // Arms
  { id: 'bc', name: 'Barbell Curl', muscleGroup: 'Arms', type: 'strength', isCustom: false },
  { id: 'td', name: 'Tricep Dip', muscleGroup: 'Arms', type: 'strength', isCustom: false },
  // Core
  { id: 'plank', name: 'Plank', muscleGroup: 'Core', type: 'strength', isCustom: false },
  { id: 'crunch', name: 'Crunch', muscleGroup: 'Core', type: 'strength', isCustom: false },
  // Cardio
  { id: 'run', name: 'Running', muscleGroup: 'Cardio', type: 'cardio', isCustom: false },
  { id: 'cycle', name: 'Cycling', muscleGroup: 'Cardio', type: 'cardio', isCustom: false },
  { id: 'rowing', name: 'Rowing Machine', muscleGroup: 'Cardio', type: 'cardio', isCustom: false },
  { id: 'treadmill', name: 'Treadmill', muscleGroup: 'Cardio', type: 'cardio', isCustom: false },
];

export const MUSCLE_GROUPS: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Full Body', 'Cardio'];
