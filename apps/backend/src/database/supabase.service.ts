import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name)
  private readonly client: SupabaseClient

  constructor(private readonly config: ConfigService) {
    const url = this.config.getOrThrow<string>('NEXT_PUBLIC_SUPABASE_URL')
    const serviceRoleKey = this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY')

    this.client = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    this.logger.log('Supabase service initialized (service_role)')
  }

  get db(): SupabaseClient {
    return this.client
  }
}
