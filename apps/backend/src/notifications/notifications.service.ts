import { Injectable, Logger } from '@nestjs/common'
import { Subject } from 'rxjs'
import { SupabaseService } from '../database/supabase.service'
import { assertNoError } from '../database/supabase.helpers'
import { CreateNotificationDto, NotificationDto, NotificationType } from './dto/notification.dto'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  private notificationSubject = new Subject<NotificationDto>()

  constructor(private readonly supabase: SupabaseService) {}

  getNotificationStream() {
    return this.notificationSubject.asObservable()
  }

  async create(dto: CreateNotificationDto, userId?: string): Promise<NotificationDto> {
    const { data, error } = await this.supabase.db
      .from('notifications')
      .insert({
        user_id: userId || null,
        title: dto.title,
        message: dto.message,
        type: dto.type,
        event_id: dto.event_id || null,
        data: dto.data || null,
        read: false,
      })
      .select()
      .single()

    const notification = assertNoError(data, error, 'NotificationsService.create') as NotificationDto
    this.notificationSubject.next(notification)
    this.logger.log(`Notification created: ${dto.title}`)
    return notification
  }

  async findUnread(userId?: string): Promise<NotificationDto[]> {
    const { data, error } = await this.supabase.db
      .from('notifications')
      .select('*')
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(50)
    return assertNoError(data, error, 'NotificationsService.findUnread') as NotificationDto[]
  }

  async findAll(userId?: string, limit = 100): Promise<NotificationDto[]> {
    const { data, error } = await this.supabase.db
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return assertNoError(data, error, 'NotificationsService.findAll') as NotificationDto[]
  }

  async markAsRead(id: string): Promise<void> {
    await this.supabase.db.from('notifications').update({ read: true }).eq('id', id)
  }

  async markAllAsRead(userId?: string): Promise<void> {
    await this.supabase.db.from('notifications').update({ read: true }).eq('read', false)
  }

  async remove(id: string): Promise<void> {
    await this.supabase.db.from('notifications').delete().eq('id', id)
  }

  async countUnread(userId?: string): Promise<number> {
    const { count, error } = await this.supabase.db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)
    if (error) throw new Error(error.message)
    return count ?? 0
  }

  async createEventReminder(eventId: string, title: string, message: string): Promise<NotificationDto> {
    return this.create({ title, message, type: NotificationType.EVENT_REMINDER, event_id: eventId })
  }

  async createShoppingListNotification(pdfUrl: string, summary: string): Promise<NotificationDto> {
    return this.create({
      title: 'Liste de courses prête',
      message: summary || 'Votre liste de courses est disponible en PDF',
      type: NotificationType.SHOPPING_LIST,
      data: { pdfUrl },
    })
  }
}
