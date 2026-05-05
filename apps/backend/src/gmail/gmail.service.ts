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

  async fetchNewMessages(accessToken: string, since: Date | null): Promise<GmailMessage[]> {
    const query = since
      ? `is:unread in:inbox after:${Math.floor(since.getTime() / 1000)}`
      : 'in:inbox'

    // Mode manuel : pagine jusqu'à vider la boîte de réception
    const allIds: string[] = []
    let pageToken: string | undefined

    do {
      const params: Record<string, string> = { q: query, maxResults: since ? '20' : '500' }
      if (pageToken) params.pageToken = pageToken

      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?` + new URLSearchParams(params),
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )

      if (!listRes.ok) {
        const errBody = await listRes.text()
        this.logger.error(`Gmail list error: ${listRes.status} — ${errBody.slice(0, 300)}`)
        break
      }

      const listData = await listRes.json() as { messages?: { id: string }[]; nextPageToken?: string }
      if (listData.messages?.length) allIds.push(...listData.messages.map(m => m.id))
      pageToken = since ? undefined : listData.nextPageToken

    } while (pageToken)

    if (!allIds.length) return []

    const messages: GmailMessage[] = []
    for (const id of allIds) {
      const msg = await this.fetchMessage(accessToken, id)
      if (msg) messages.push(msg)
    }

    return messages
  }

  async listLabels(accessToken: string): Promise<Map<string, string>> {
    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!res.ok) return new Map()
    const data = await res.json() as { labels: { id: string; name: string }[] }
    return new Map(data.labels.map(l => [l.name, l.id]))
  }

  async getOrCreateLabel(
    accessToken: string,
    name: string,
    cache: Map<string, string>,
  ): Promise<string | null> {
    if (cache.has(name)) return cache.get(name)!

    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      },
    )
    if (!res.ok) return null
    const label = await res.json() as { id: string; name: string }
    cache.set(label.name, label.id)
    return label.id
  }

  async moveToLabel(accessToken: string, messageId: string, labelId: string | null): Promise<void> {
    const body = labelId
      ? { addLabelIds: [labelId], removeLabelIds: ['INBOX'] }
      : { removeLabelIds: ['INBOX'] }

    await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
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
