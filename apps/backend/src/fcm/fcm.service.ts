import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as admin from 'firebase-admin'

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  data?: Record<string, string>
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name)
  readonly isConfigured: boolean

  constructor(private readonly config: ConfigService) {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID')
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL')
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY')
    this.isConfigured = !!(projectId && clientEmail && privateKey)
  }

  onModuleInit() {
    if (!this.isConfigured) {
      this.logger.warn('Firebase FCM non configuré (FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY manquants)')
      return
    }

    // Éviter la double initialisation si l'app existe déjà
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.config.get<string>('FIREBASE_PROJECT_ID'),
          clientEmail: this.config.get<string>('FIREBASE_CLIENT_EMAIL'),
          privateKey: this.config.get<string>('FIREBASE_PRIVATE_KEY')!.replace(/\\n/g, '\n'),
        }),
      })
    }

    this.logger.log('Firebase FCM prêt')
  }

  async sendToToken(token: string, payload: PushNotificationPayload): Promise<boolean> {
    if (!this.isConfigured) return false

    try {
      await admin.messaging().send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/icon-192x192.png',
          },
          fcmOptions: { link: '/' },
        },
        data: payload.data,
      })
      this.logger.log(`Notification envoyée : "${payload.title}"`)
      return true
    } catch (error) {
      this.logger.error(`FCM send error: ${(error as Error).message}`)
      return false
    }
  }

  async sendToTokens(tokens: string[], payload: PushNotificationPayload): Promise<number> {
    if (!this.isConfigured || tokens.length === 0) return 0

    const results = await Promise.allSettled(
      tokens.map(token => this.sendToToken(token, payload))
    )

    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length
    this.logger.log(`Notifications envoyées : ${sent}/${tokens.length}`)
    return sent
  }
}
