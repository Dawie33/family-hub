import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import {
  UserProfile,
  TrainingProgram,
  WorkoutSession,
  GenerateProgramDto,
  ProgramPreview,
} from './dto/training-camp.types'

@Injectable()
export class TrainingCampClient implements OnModuleInit {
  private readonly logger = new Logger(TrainingCampClient.name)
  private client: AxiosInstance
  private token: string | null = null
  private readonly email: string
  private readonly password: string
  readonly isConfigured: boolean

  constructor(private config: ConfigService) {
    const baseURL = this.config.get<string>('TRAINING_CAMP_API_URL', '')
    this.email = this.config.get<string>('TRAINING_CAMP_EMAIL', '')
    this.password = this.config.get<string>('TRAINING_CAMP_PASSWORD', '')
    this.isConfigured = !!(baseURL && this.email && this.password)

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    })

    // Intercepteur : re-login automatique sur 401 (sauf pour le login lui-même)
    this.client.interceptors.response.use(
      res => res,
      async error => {
        const isLoginRequest = error.config?.url?.includes('/auth/login')
        if (error.response?.status === 401 && this.isConfigured && !isLoginRequest) {
          this.logger.warn('Token expiré, re-login automatique...')
          await this.authenticate()
          if (!this.token) return Promise.reject(error)
          error.config.headers['Authorization'] = `Bearer ${this.token}`
          return this.client.request(error.config)
        }
        return Promise.reject(error)
      }
    )
  }

  async onModuleInit() {
    if (!this.isConfigured) {
      this.logger.warn('Training Camp non configuré (TRAINING_CAMP_URL/EMAIL/PASSWORD manquants)')
    }
    // Pas de login au démarrage — connexion lazy à la première utilisation
  }

  private async authenticate(): Promise<void> {
    try {
      const { data } = await this.client.post('/auth/login', {
        email: this.email,
        password: this.password,
      })
      this.token = data.access_token
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
      this.logger.log(`Training Camp connecté : ${this.email}`)
    } catch (error) {
      this.logger.error(`Training Camp login failed: ${error.message}`)
      this.token = null
    }
  }

  private async ensureReady(): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('Training Camp non disponible')
    }
    if (!this.token) {
      await this.authenticate()
    }
    if (!this.token) {
      throw new Error('Training Camp non disponible')
    }
  }

  async getProfile(): Promise<UserProfile> {
    await this.ensureReady()
    const { data } = await this.client.get<UserProfile>('/users/me')
    this.logger.debug(`Profile fetched`)
    return data
  }

  async getActiveProgram(): Promise<TrainingProgram | null> {
    await this.ensureReady()
    try {
      const { data } = await this.client.get<TrainingProgram>('/training-programs/active')
      return data
    } catch (error) {
      if (error.response?.status === 404) return null
      throw error
    }
  }

  async getWeekProgram(programId: string, weekNum: number): Promise<any> {
    await this.ensureReady()
    const { data } = await this.client.get(`/training-programs/enrollments/${programId}/week/${weekNum}`)
    return data
  }

  async getRecentSessions(limit = 10): Promise<WorkoutSession[]> {
    await this.ensureReady()
    const { data } = await this.client.get<WorkoutSession[]>('/workout-sessions', { params: { limit } })
    this.logger.debug(`Fetched ${data.length} recent sessions`)
    return data
  }

  async generateProgram(params: GenerateProgramDto): Promise<ProgramPreview> {
    await this.ensureReady()
    const { data } = await this.client.post<ProgramPreview>('/training-programs/generate-ai', params)
    return data
  }

  async saveProgram(program: any): Promise<any> {
    await this.ensureReady()
    const { data } = await this.client.post('/training-programs', program)
    this.logger.debug(`Program saved: ${data.id}`)
    return data
  }

  async logWorkout(session: any): Promise<any> {
    await this.ensureReady()
    const { data } = await this.client.post('/workout-sessions', session)
    this.logger.debug(`Workout logged: ${data.id}`)
    return data
  }

  getProfileSummary(profile: UserProfile): string {
    const injuries = profile.injuries?.map(i => `${i.name} (${i.affected_area})`).join(', ') || 'aucune'
    const goals = profile.global_goals
      ? Object.entries(profile.global_goals)
          .filter(([_, v]) => v === true)
          .map(([k]) => k.replace('_', ' '))
          .join(', ')
      : 'non définis'

    return `
## Profil Sportif
- **Niveau**: ${profile.sport_level}
- **Localisation**: ${profile.training_location}
- **Objectifs**: ${goals}
- **Blessures/limitations**: ${injuries}
- **Équipement disponible**: ${profile.equipment_available?.join(', ') || 'non défini'}
${profile.weight ? `- **Poids**: ${profile.weight}kg` : ''}
${profile.height ? `- **Taille**: ${profile.height}cm` : ''}
- **Stats**: ${profile.stats.sessions} séances | ${profile.stats.total_time_minutes}min totales
`.trim()
  }

  getProgramSummary(program: TrainingProgram): string {
    const currentWeek = program.current_week || 1
    const weekSessions = program.weekly_sessions?.filter(s => s.week_number === currentWeek) || []

    let summary = `
## Programme Actif: ${program.name}
- **Durée**: ${program.duration_weeks} semaines
- **Semaine actuelle**: ${currentWeek}/${program.duration_weeks}
- **Statut**: ${program.status}
- **Sessions cette semaine**:
`
    if (weekSessions.length === 0) {
      summary += '- Aucune session planifiée cette semaine'
    } else {
      const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
      weekSessions.forEach(session => {
        summary += `\n  - ${dayNames[session.day_of_week - 1] || `Jour ${session.day_of_week}`}: ${session.title} (${session.workout_type})`
      })
    }

    return summary
  }
}
