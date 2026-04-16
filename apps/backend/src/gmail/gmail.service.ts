import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

const GOOGLE_CLIENT_ID_KEY = 'GOOGLE_CLIENT_ID'
const GOOGLE_CLIENT_SECRET_KEY = 'GOOGLE_CLIENT_SECRET'

export interface GmailMessage {
  id: string
  subject: string
  from: string
  body: string
  date: Date
}

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name)

  constructor(private readonly config: ConfigService) {}

  async refreshToken(refreshToken: string): Promise<string | null> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.get<string>(GOOGLE_CLIENT_ID_KEY)!,
        client_secret: this.config.get<string>(GOOGLE_CLIENT_SECRET_KEY)!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) return null
    const data = await res.json() as { access_token: string }
    return data.access_token
  }

  async fetchNewMessages(accessToken: string, since: Date): Promise<GmailMessage[]> {
    // Recherche les emails non lus reçus depuis la dernière vérification
    const afterTimestamp = Math.floor(since.getTime() / 1000)
    const query = `is:unread after:${afterTimestamp}`

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?` +
      new URLSearchParams({ q: query, maxResults: '20' }),
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!listRes.ok) {
      this.logger.error(`Gmail list error: ${listRes.status}`)
      return []
    }

    const listData = await listRes.json() as { messages?: { id: string }[] }
    if (!listData.messages?.length) return []

    const messages: GmailMessage[] = []

    for (const { id } of listData.messages) {
      const msg = await this.fetchMessage(accessToken, id)
      if (msg) messages.push(msg)
    }

    return messages
  }

  private async fetchMessage(accessToken: string, id: string): Promise<GmailMessage | null> {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!res.ok) return null

    const data = await res.json() as {
      id: string
      internalDate: string
      payload: {
        headers: { name: string; value: string }[]
        parts?: { mimeType: string; body: { data?: string } }[]
        body?: { data?: string }
      }
    }

    const headers = data.payload.headers
    const subject = headers.find(h => h.name === 'Subject')?.value ?? '(sans objet)'
    const from = headers.find(h => h.name === 'From')?.value ?? ''
    const date = new Date(parseInt(data.internalDate))

    const body = this.extractBody(data.payload)

    return { id, subject, from, body, date }
  }

  private extractBody(payload: {
    parts?: { mimeType: string; body: { data?: string } }[]
    body?: { data?: string }
  }): string {
    // Cherche d'abord la partie text/plain
    if (payload.parts) {
      const textPart = payload.parts.find(p => p.mimeType === 'text/plain')
      if (textPart?.body?.data) {
        return Buffer.from(textPart.body.data, 'base64url').toString('utf-8').slice(0, 2000)
      }
    }

    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64url').toString('utf-8').slice(0, 2000)
    }

    return ''
  }
}
