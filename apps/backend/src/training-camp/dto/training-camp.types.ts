export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  gender: 'male' | 'female' | 'other' | null
  sport_level: 'beginner' | 'intermediate' | 'advanced' | 'elite'
  height: number | null
  weight: number | null
  body_fat_percentage: number | null
  injuries: Injury[] | null
  equipment_available: string[] | null
  training_location: 'home' | 'gym' | 'outdoor' | 'mixed'
  global_goals: GlobalGoals | null
  stats: {
    workouts: number
    sessions: number
    total_time_minutes: number
  }
}

export interface Injury {
  name: string
  severity: 'mild' | 'moderate' | 'severe'
  affected_area: string
}

export interface GlobalGoals {
  weight_loss?: boolean
  muscle_gain?: boolean
  endurance?: boolean
  strength?: boolean
  flexibility?: boolean
  skill?: boolean
}

export interface TrainingProgram {
  id: string
  name: string
  description: string
  duration_weeks: number
  goal: string
  current_week: number
  status: 'active' | 'paused' | 'completed' | 'abandoned'
  weekly_sessions: WeeklySession[]
}

export interface WeeklySession {
  id: string
  week_number: number
  day_of_week: number
  title: string
  workout_type: string
  estimated_duration: number
  status: 'planned' | 'completed' | 'skipped'
}

export interface WorkoutSession {
  id: string
  workout_id: string
  started_at: string
  completed_at: string | null
  results: WorkoutResults
  workout_name: string
}

export interface WorkoutResults {
  elapsed_time_seconds?: number
  rounds_completed?: number
  exercises_completed?: number
  notes?: string
}

export interface GenerateProgramDto {
  goal: string
  duration_weeks?: number
  sessions_per_week?: number
  equipment_available?: string[]
  injuries?: string[]
}

export interface ProgramPreview {
  name: string
  description: string
  weeks: WeekPreview[]
}

export interface WeekPreview {
  week_number: number
  sessions: SessionPreview[]
}

export interface SessionPreview {
  day_of_week: number
  title: string
  workout_type: string
  exercises: ExercisePreview[]
}

export interface ExercisePreview {
  name: string
  sets: number
  reps: string
  rest_seconds: number
}
