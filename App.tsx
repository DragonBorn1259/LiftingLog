import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Dumbbell, 
  Settings, 
  Plus, 
  ChevronLeft, 
  Search, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Moon,
  Sun,
  Smartphone,
  Copy,
  MoreVertical,
  Pencil,
  X,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { AppState, ExerciseDef, SetEntry, ThemeMode, WorkoutDay, WorkoutExercise } from './types';
import { loadState, saveState, generateId, resetStorage } from './services/storage';
import { MUSCLE_GROUPS, INITIAL_EXERCISES } from './constants';

// --- Constants ---
const CHART_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#14b8a6'];

// --- Types ---
type Screen = 'HOME' | 'SETTINGS';
type SubScreen = 
  | { type: 'NONE' }
  | { type: 'WORKOUT_EDITOR'; date: string }
  | { type: 'ADD_EXERCISE'; date: string }
  | { type: 'CREATE_CUSTOM_EXERCISE'; date?: string };

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  action: () => void;
  isDangerous?: boolean;
}

// --- Shared Components ---

const Button: React.FC<{
  onClick?: (e: React.MouseEvent) => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive';
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ onClick, variant = 'primary', className = '', children, disabled }) => {
  const base = "px-4 py-3 rounded-xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-primary text-white shadow-lg shadow-primary/30",
    secondary: "bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-white",
    ghost: "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800",
    danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
    destructive: "bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    {...props}
    className={`w-full bg-gray-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder-gray-400 ${props.className}`}
  />
);

// Improved Number Input for Sets (handles decimals and 0 correctly)
const SetInput = ({ 
  value, 
  onChange,
  placeholder 
}: { 
  value: number | undefined; 
  onChange: (val: number) => void;
  placeholder?: string;
}) => {
  const [localValue, setLocalValue] = useState(value?.toString() ?? '');
  
  // Sync local state when prop changes (only if different logic requires it)
  useEffect(() => {
    // If external value changes and doesn't match our local parsed value, update local
    // This allows "1." to stay "1." while value is 1
    if (value !== undefined) {
      const localParsed = parseFloat(localValue);
      if (localParsed !== value) {
        setLocalValue(value.toString());
      }
    } else {
       if (localValue !== '') setLocalValue('');
    }
  }, [value]);

  return (
    <Input 
      type="number" 
      inputMode="decimal"
      className="text-center font-mono !py-2 !px-1 text-sm"
      value={localValue}
      placeholder={placeholder}
      onChange={(e) => {
        const newVal = e.target.value;
        setLocalValue(newVal);
        const parsed = parseFloat(newVal);
        if (!isNaN(parsed)) {
          onChange(parsed);
        } else {
           onChange(0); 
        }
      }}
      onBlur={() => {
        // Optional cleanup on blur
        if (value !== undefined) setLocalValue(value.toString());
      }}
    />
  );
};

const ConfirmationModal: React.FC<ConfirmationState & { onClose: () => void }> = ({ 
  isOpen, title, message, action, onClose, isDangerous 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          {isDangerous && <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-500"><AlertTriangle size={24} /></div>}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">{message}</p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            variant={isDangerous ? "destructive" : "primary"} 
            onClick={() => { action(); onClose(); }}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
};

const EditWorkoutModal: React.FC<{
  isOpen: boolean;
  workout: WorkoutDay;
  exercises: ExerciseDef[];
  onClose: () => void;
  onSave: (newName: string, newDate: string, exercisesToRemove: string[]) => void;
}> = ({ isOpen, workout, exercises, onClose, onSave }) => {
  const [name, setName] = useState(workout.name || "");
  const [date, setDate] = useState(workout.date);
  const [removedExerciseIds, setRemovedExerciseIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleToggleRemove = (id: string) => {
    const next = new Set(removedExerciseIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRemovedExerciseIds(next);
  };

  const getExerciseName = (id: string) => exercises.find(e => e.id === id)?.name || "Unknown";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-lg font-bold dark:text-white">Edit Workout</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Workout Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Leg Day" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</label>
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Manage Exercises</label>
            <div className="space-y-2">
              {workout.exercises.map(we => (
                <div 
                  key={we.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    removedExerciseIds.has(we.id) 
                      ? "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 opacity-60" 
                      : "border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50"
                  }`}
                >
                  <span className={`font-medium dark:text-gray-200 ${removedExerciseIds.has(we.id) ? 'line-through' : ''}`}>
                    {getExerciseName(we.exerciseId)}
                  </span>
                  <button 
                    onClick={() => handleToggleRemove(we.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      removedExerciseIds.has(we.id) 
                        ? "text-red-500 bg-red-100 dark:bg-red-900/30" 
                        : "text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {removedExerciseIds.has(we.id) ? "Undo" : <Trash2 size={18} />}
                  </button>
                </div>
              ))}
              {workout.exercises.length === 0 && (
                <p className="text-sm text-gray-400 italic">No exercises in this workout.</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(name, date, Array.from(removedExerciseIds))}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [state, setState] = useState<AppState>(loadState());
  const [screen, setScreen] = useState<Screen>('HOME');
  const [subScreen, setSubScreen] = useState<SubScreen>({ type: 'NONE' });
  const [confirmation, setConfirmation] = useState<ConfirmationState>({ 
    isOpen: false, title: "", message: "", action: () => {} 
  });

  // Persist State
  useEffect(() => {
    saveState(state);
    if (state.theme === 'dark' || (state.theme === 'amoled')) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state]);

  // Actions
  const updateWorkouts = (newWorkouts: Record<string, WorkoutDay>) => {
    setState(s => ({ ...s, workouts: newWorkouts }));
  };

  const handleResetData = () => {
    setConfirmation({
      isOpen: true,
      title: "Reset All Data?",
      message: "This will delete all your workouts and restore default exercises. This action cannot be undone.",
      isDangerous: true,
      action: () => {
        const defaults = resetStorage();
        setState(defaults);
        setScreen('HOME');
      }
    });
  };

  const handleCreateWorkout = (date: string) => {
    // Optimistic update
    setState(current => {
      const nextWorkouts = { ...current.workouts };
      if (!nextWorkouts[date]) {
        nextWorkouts[date] = { date, exercises: [], completed: false };
      }
      return { ...current, workouts: nextWorkouts };
    });
    setSubScreen({ type: 'WORKOUT_EDITOR', date });
  };

  const handleDeleteWorkout = (date: string) => {
    setConfirmation({
      isOpen: true,
      title: "Delete Workout?",
      message: "This will permanently delete this workout and all its data.",
      isDangerous: true,
      action: () => {
        const next = { ...state.workouts };
        delete next[date];
        updateWorkouts(next);
        setSubScreen({ type: 'NONE' });
      }
    });
  };

  const handleUpdateWorkoutMeta = (oldDate: string, newName: string, newDate: string, exercisesToRemove: string[]) => {
    const oldWorkout = state.workouts[oldDate];
    if (!oldWorkout) return;

    // Filter exercises
    const keptExercises = oldWorkout.exercises.filter(e => !exercisesToRemove.includes(e.id));
    
    const nextWorkouts = { ...state.workouts };

    if (oldDate === newDate) {
      // Just update name and exercises
      nextWorkouts[oldDate] = { ...oldWorkout, name: newName, exercises: keptExercises };
    } else {
      // Move date
      // If target exists, merge exercises
      const existingTarget = nextWorkouts[newDate];
      const mergedExercises = existingTarget 
        ? [...existingTarget.exercises, ...keptExercises] 
        : keptExercises;
      
      nextWorkouts[newDate] = {
        date: newDate,
        name: newName || existingTarget?.name, // Prefer new name
        completed: existingTarget ? existingTarget.completed : oldWorkout.completed,
        exercises: mergedExercises
      };
      
      delete nextWorkouts[oldDate];
    }
    
    updateWorkouts(nextWorkouts);
    setSubScreen({ type: 'WORKOUT_EDITOR', date: newDate });
  };

  const handleAddExerciseToWorkout = (date: string, exerciseId: string) => {
    const workout = state.workouts[date];
    if (!workout) {
      // Should not happen with new handleCreateWorkout, but safety first
      handleCreateWorkout(date); 
      return; 
    }

    const newExercise: WorkoutExercise = {
      id: generateId(),
      exerciseId,
      sets: [{ id: generateId(), weight: 0, reps: 0, completed: false }]
    };

    updateWorkouts({
      ...state.workouts,
      [date]: { ...workout, exercises: [...workout.exercises, newExercise] }
    });
    setSubScreen({ type: 'WORKOUT_EDITOR', date });
  };

  // --- Views ---

  // 1. Calendar View
  const CalendarView = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const days = useMemo(() => {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    }, [currentDate]);

    const offset = startOfMonth(currentDate).getDay();
    const blanks = Array(offset).fill(null);

    return (
      <div className="flex flex-col h-full animate-in fade-in pb-24">
        <div className="flex items-center justify-between p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}>
              <ChevronLeft className="w-5 h-5 rotate-180" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 px-4 text-center mb-4">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i} className="text-xs font-bold text-gray-400">{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 px-4 flex-1 content-start">
          {blanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const workout = state.workouts[dateStr];
            const isTodayDate = isToday(day);

            return (
              <div 
                key={dateStr}
                onClick={() => handleCreateWorkout(dateStr)}
                className={`
                  aspect-square rounded-2xl relative border transition-all cursor-pointer flex flex-col items-center justify-center
                  ${isTodayDate 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-300 hover:border-primary/50'}
                `}
              >
                <span className={`text-sm font-semibold ${isTodayDate ? 'font-bold' : ''}`}>
                  {format(day, 'd')}
                </span>
                {workout && (
                  <div className={`mt-1 w-2 h-2 rounded-full ${workout.completed ? 'bg-green-500' : 'bg-secondary'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 2. Workout Editor
  const WorkoutEditor = ({ date }: { date: string }) => {
    const workout = state.workouts[date];
    const [editModalOpen, setEditModalOpen] = useState(false);
    
    // UI State for mobile menus
    const [openExerciseMenuId, setOpenExerciseMenuId] = useState<string | null>(null);
    const [openSetMenuId, setOpenSetMenuId] = useState<string | null>(null);

    const getExerciseDef = (id: string) => state.exercises.find(e => e.id === id);

    // Analytics: Calculate Volume (Weight * Reps) per Exercise for completed sets
    const chartData = useMemo(() => {
        if (!workout) return [];
        const data: Record<string, number> = {};
        
        workout.exercises.forEach(ex => {
            const def = getExerciseDef(ex.exerciseId);
            if (!def) return;
            // Calculate volume for this exercise
            const vol = ex.sets.reduce((acc, set) => {
                if (!set.completed) return acc;
                // For cardio, we might just track 'reps' (as distance or time) or skip it for "volume load" graph
                // To keep it simple and per user request "Weight * Reps", we assume strength mainly.
                const weight = set.weight || 0;
                const reps = set.reps || 0;
                return acc + (weight * reps);
            }, 0);

            if (vol > 0) {
                data[def.name] = (data[def.name] || 0) + vol;
            }
        });

        return Object.entries(data)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [workout, state.exercises]);
    
    // Close menus on outside click/interaction
    useEffect(() => {
      const closeMenus = () => {
        setOpenExerciseMenuId(null);
        setOpenSetMenuId(null);
      };
    }, []);

    // Fallback if workout not found (e.g. race condition or deleted)
    if (!workout) {
      return (
        <div className="h-full flex items-center justify-center flex-col p-6 text-center">
          <p className="text-gray-500 mb-4">Workout not found.</p>
          <Button onClick={() => setSubScreen({ type: 'NONE'})}>Go Back</Button>
        </div>
      );
    }

    const handleUpdateSet = (exerciseIndex: number, setIndex: number, updates: Partial<SetEntry>) => {
      const newExercises = [...workout.exercises];
      newExercises[exerciseIndex].sets[setIndex] = { 
        ...newExercises[exerciseIndex].sets[setIndex], 
        ...updates 
      };
      updateWorkouts({ ...state.workouts, [date]: { ...workout, exercises: newExercises } });
    };

    const handleAddSet = (exerciseIndex: number) => {
      const newExercises = [...workout.exercises];
      const prevSet = newExercises[exerciseIndex].sets[newExercises[exerciseIndex].sets.length - 1];
      newExercises[exerciseIndex].sets.push({
        id: generateId(),
        weight: prevSet?.weight || 0,
        reps: prevSet?.reps || 0,
        completed: false
      });
      updateWorkouts({ ...state.workouts, [date]: { ...workout, exercises: newExercises } });
    };

    const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
      setOpenSetMenuId(null); // Close menu
      setConfirmation({
        isOpen: true,
        title: "Delete Set",
        message: "Are you sure you want to delete this set?",
        isDangerous: true,
        action: () => {
          const newExercises = [...workout.exercises];
          newExercises[exerciseIndex].sets.splice(setIndex, 1);
          updateWorkouts({ ...state.workouts, [date]: { ...workout, exercises: newExercises } });
        }
      });
    };

    const handleRemoveExercise = (exerciseId: string) => {
       setOpenExerciseMenuId(null); // Close menu
       setConfirmation({
        isOpen: true,
        title: "Delete Exercise",
        message: "Remove this exercise and all its sets?",
        isDangerous: true,
        action: () => {
          const newExercises = workout.exercises.filter(e => e.id !== exerciseId);
          updateWorkouts({ ...state.workouts, [date]: { ...workout, exercises: newExercises } });
        }
      });
    };

    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-black animate-in slide-in-from-bottom-10 duration-200">
        <EditWorkoutModal 
          isOpen={editModalOpen} 
          onClose={() => setEditModalOpen(false)}
          workout={workout}
          exercises={state.exercises}
          onSave={(name, newDate, removed) => {
            handleUpdateWorkoutMeta(date, name, newDate, removed);
            setEditModalOpen(false);
          }}
        />

        {/* Header */}
        <div className="p-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <Button variant="ghost" onClick={() => setSubScreen({ type: 'NONE' })} className="!p-2">
            <ChevronLeft />
          </Button>
          <div className="text-center">
             <h2 className="text-lg font-bold text-gray-900 dark:text-white max-w-[150px] truncate">
              {workout.name || "Workout"}
            </h2>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {format(parseISO(date), 'MMM d, yyyy')}
            </div>
          </div>
          <div className="flex gap-1">
             <Button variant="ghost" className="!p-2 text-primary" onClick={() => setEditModalOpen(true)}>
              <Pencil size={20} />
            </Button>
            <Button variant="ghost" className="!p-2 text-red-500" onClick={() => handleDeleteWorkout(date)}>
              <Trash2 size={20} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32" onClick={() => { setOpenExerciseMenuId(null); setOpenSetMenuId(null); }}>
          
          {/* Workout Analysis Chart */}
          {chartData.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-2">
                    <PieChartIcon className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">Exercise Volume</h3>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number) => [`${value.toLocaleString()} lbs`, 'Volume']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tooltip-bg, #fff)' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
          )}
          
          {workout.exercises.length === 0 && (
             <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
                <Dumbbell className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No exercises yet.</p>
                <p className="text-xs text-gray-400">Tap "Add Exercise" below.</p>
             </div>
          )}

          {workout.exercises.map((exercise, exIndex) => {
            const def = getExerciseDef(exercise.exerciseId);
            if (!def) return null;

            return (
              <div key={exercise.id} className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-zinc-800 relative z-0">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{def.name}</h3>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{def.muscleGroup}</span>
                  </div>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                     <Button variant="ghost" className="!p-1 h-8 w-8" onClick={() => setOpenExerciseMenuId(openExerciseMenuId === exercise.id ? null : exercise.id)}>
                        <MoreVertical size={16} />
                     </Button>
                     
                     {/* Mobile-Friendly Dropdown */}
                     {openExerciseMenuId === exercise.id && (
                       <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl shadow-xl p-1 z-20 min-w-[140px] animate-in zoom-in-95 duration-100">
                          <button 
                            onClick={() => handleRemoveExercise(exercise.id)}
                            className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2"
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                       </div>
                     )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-10 text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 text-center">
                    <div className="col-span-1">Set</div>
                    <div className="col-span-3">{def.type === 'cardio' ? 'Min' : 'Lbs'}</div>
                    <div className="col-span-3">{def.type === 'cardio' ? 'Km' : 'Reps'}</div>
                    <div className="col-span-3">Check</div>
                  </div>

                  {exercise.sets.map((set, setIndex) => (
                    <div key={set.id} className="grid grid-cols-10 gap-2 items-center">
                      <div className="col-span-1 relative" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setOpenSetMenuId(openSetMenuId === set.id ? null : set.id)}
                          className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 text-xs font-bold flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          {setIndex + 1}
                        </button>
                        
                        {/* Mobile-Friendly Set Menu */}
                        {openSetMenuId === set.id && (
                          <div className="absolute left-0 top-full mt-1 flex flex-col bg-white dark:bg-zinc-800 shadow-xl rounded-lg p-1 z-30 min-w-[100px] border dark:border-zinc-700 animate-in zoom-in-95 duration-100">
                             <button 
                                onClick={() => handleRemoveSet(exIndex, setIndex)}
                                className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-md text-left flex items-center gap-2"
                             >
                                <Trash2 size={12} /> Delete
                             </button>
                          </div>
                        )}
                      </div>

                      <div className="col-span-3">
                        <SetInput 
                          value={def.type === 'cardio' ? set.timeMinutes : set.weight}
                          placeholder="-"
                          onChange={(val) => handleUpdateSet(exIndex, setIndex, { [def.type === 'cardio' ? 'timeMinutes' : 'weight']: val })}
                        />
                      </div>
                      <div className="col-span-3">
                         <SetInput 
                          value={def.type === 'cardio' ? set.distanceKm : set.reps}
                          placeholder="-"
                          onChange={(val) => handleUpdateSet(exIndex, setIndex, { [def.type === 'cardio' ? 'distanceKm' : 'reps']: val })}
                        />
                      </div>
                      <div className="col-span-3 flex justify-center">
                        <button 
                          onClick={() => handleUpdateSet(exIndex, setIndex, { completed: !set.completed })}
                          className={`
                            h-10 w-full rounded-xl flex items-center justify-center transition-all duration-300
                            ${set.completed 
                              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                              : 'bg-gray-100 dark:bg-zinc-800 text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'}
                          `}
                        >
                          {set.completed ? <CheckCircle2 size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-zinc-600" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <Button variant="ghost" className="w-full mt-2 text-sm text-primary" onClick={() => handleAddSet(exIndex)}>
                    <Plus size={16} /> Add Set
                  </Button>
                </div>
              </div>
            );
          })}

          <Button 
            variant="secondary" 
            className="w-full py-4 text-primary bg-primary/10 hover:bg-primary/20"
            onClick={() => setSubScreen({ type: 'ADD_EXERCISE', date })}
          >
            <Plus size={20} /> Add Exercise
          </Button>
        </div>
      </div>
    );
  };

  // 3. Exercise Selector
  const ExerciseSelector = ({ date }: { date: string }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMuscle, setSelectedMuscle] = useState<string | 'All'>('All');

    const filteredExercises = useMemo(() => {
        return state.exercises.filter(ex => {
            const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesMuscle = selectedMuscle === 'All' || ex.muscleGroup === selectedMuscle;
            return matchesSearch && matchesMuscle;
        });
    }, [searchTerm, selectedMuscle, state.exercises]);

    return (
        <div className="h-full flex flex-col bg-white dark:bg-zinc-900 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
                <Button variant="ghost" className="!p-2" onClick={() => setSubScreen({ type: 'WORKOUT_EDITOR', date })}>
                    <ChevronLeft />
                </Button>
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            autoFocus
                            placeholder="Search exercises..."
                            className="pl-9 py-2 text-sm bg-gray-100 dark:bg-zinc-800"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="p-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-gray-50 dark:border-zinc-800">
                <button
                    onClick={() => setSelectedMuscle('All')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedMuscle === 'All' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}`}
                >
                    All
                </button>
                {MUSCLE_GROUPS.map((mg) => (
                    <button
                        key={mg}
                        onClick={() => setSelectedMuscle(mg)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedMuscle === mg ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}`}
                    >
                        {mg}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-2 pb-safe">
                <button
                    onClick={() => setSubScreen({ type: 'CREATE_CUSTOM_EXERCISE', date })}
                    className="w-full text-left p-4 mb-2 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl flex items-center justify-between group transition-colors border border-dashed border-primary/30"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Plus size={18} />
                        </div>
                        <div>
                            <div className="font-bold">Create Custom Exercise</div>
                            <div className="text-xs opacity-70">Add something not in the list</div>
                        </div>
                    </div>
                </button>

                {filteredExercises.map((ex) => (
                    <button
                        key={ex.id}
                        onClick={() => handleAddExerciseToWorkout(date, ex.id)}
                        className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl flex items-center justify-between group transition-colors border-b border-gray-50 dark:border-zinc-800/50 last:border-0"
                    >
                        <div>
                            <div className="font-bold text-gray-900 dark:text-white">{ex.name}</div>
                            <div className="text-xs text-gray-500">{ex.muscleGroup}</div>
                        </div>
                        <Plus className="text-gray-300 group-hover:text-primary transition-colors" />
                    </button>
                ))}

                {filteredExercises.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-60">
                        <Dumbbell className="w-12 h-12 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">No exercises found.</p>
                    </div>
                )}
            </div>
        </div>
    );
  };

  // 4. Custom Exercise Editor
  const CustomExerciseEditor = ({ date }: { date?: string }) => {
    const [name, setName] = useState('');
    const [muscle, setMuscle] = useState<string>(MUSCLE_GROUPS[0]);
    const [type, setType] = useState<'strength' | 'cardio'>('strength');

    const handleSave = () => {
      if (!name.trim()) return;
      
      const newEx: ExerciseDef = {
        id: generateId(),
        name: name.trim(),
        muscleGroup: muscle as any,
        type,
        isCustom: true
      };

      setState(s => ({
        ...s,
        exercises: [...s.exercises, newEx]
      }));

      if (date) {
        setSubScreen({ type: 'ADD_EXERCISE', date });
      } else {
        setSubScreen({ type: 'NONE' });
      }
    };

    return (
      <div className="h-full flex flex-col bg-white dark:bg-zinc-900 animate-in slide-in-from-bottom duration-200">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3">
          <Button variant="ghost" className="!p-2" onClick={() => date ? setSubScreen({ type: 'ADD_EXERCISE', date }) : setSubScreen({ type: 'NONE' })}>
            <ChevronLeft />
          </Button>
          <h2 className="text-lg font-bold dark:text-white">New Exercise</h2>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500">Exercise Name</label>
            <Input 
              placeholder="e.g. Diamond Pushups" 
              value={name} 
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500">Muscle Group</label>
            <div className="grid grid-cols-2 gap-2">
              {MUSCLE_GROUPS.map(mg => (
                <button
                  key={mg}
                  onClick={() => setMuscle(mg)}
                  className={`p-3 rounded-xl text-sm font-medium border transition-all ${muscle === mg ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 dark:border-zinc-800 text-gray-500'}`}
                >
                  {mg}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500">Exercise Type</label>
            <div className="flex gap-2">
              {(['strength', 'cardio'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 p-3 rounded-xl text-sm font-medium border transition-all capitalize ${type === t ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 dark:border-zinc-800 text-gray-500'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-zinc-800">
          <Button className="w-full" onClick={handleSave} disabled={!name.trim()}>
            Create Exercise
          </Button>
        </div>
      </div>
    );
  };

  // --- Router ---
  const renderContent = () => {
    if (subScreen.type === 'WORKOUT_EDITOR') return <WorkoutEditor date={subScreen.date} />;
    if (subScreen.type === 'ADD_EXERCISE') return <ExerciseSelector date={subScreen.date} />;
    if (subScreen.type === 'CREATE_CUSTOM_EXERCISE') return <CustomExerciseEditor date={subScreen.date} />;
    
    // Main Tabs
    switch (screen) {
      case 'HOME': return <CalendarView />;
      case 'SETTINGS': return (
        <div className="p-6">
          <h2 className="text-2xl font-bold dark:text-white mb-6">Settings</h2>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm space-y-6">
             {/* Theme Toggle */}
             <div className="flex items-center justify-between">
               <span className="font-medium dark:text-gray-200">Theme</span>
               <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
                 {(['light', 'dark', 'amoled'] as ThemeMode[]).map(t => (
                   <button
                    key={t}
                    onClick={() => setState(s => ({ ...s, theme: t }))}
                    className={`p-2 rounded-lg transition-all ${state.theme === t ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary' : 'text-gray-400'}`}
                   >
                     {t === 'light' ? <Sun size={18} /> : t === 'dark' ? <Moon size={18} /> : <Smartphone size={18} />}
                   </button>
                 ))}
               </div>
             </div>

             {/* Danger Zone */}
             <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                <h4 className="text-sm font-semibold text-red-500 mb-3 uppercase tracking-wider">Danger Zone</h4>
                <Button variant="danger" className="w-full text-red-500 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20" onClick={handleResetData}>
                  <RefreshCw size={18} /> Reset App Data
                </Button>
             </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className={`h-screen w-full flex flex-col ${state.theme === 'amoled' ? 'bg-black' : 'bg-gray-50 dark:bg-zinc-950'} transition-colors duration-300`}>
      <ConfirmationModal 
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        action={confirmation.action}
        isDangerous={confirmation.isDangerous}
        onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="flex-1 overflow-hidden relative max-w-md mx-auto w-full bg-white/50 dark:bg-zinc-900/50 shadow-2xl">
        {renderContent()}
      </div>

      {/* Bottom Nav */}
      {subScreen.type === 'NONE' && (
        <div className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 pb-safe max-w-md mx-auto w-full">
          <div className="flex justify-around items-center p-2">
            {[
              { id: 'HOME', icon: CalendarIcon, label: 'Log' },
              { id: 'SETTINGS', icon: Settings, label: 'Settings' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setScreen(item.id as Screen)}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                  screen === item.id 
                    ? 'text-primary bg-primary/10' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <item.icon size={24} strokeWidth={screen === item.id ? 2.5 : 2} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;