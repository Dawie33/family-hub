import { Controller, Get, Post, Patch, Delete, Param, Body, Sse } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, NotificationDto } from './dto/notification.dto';
import { FcmService } from '../fcm/fcm.service';

interface MessageEvent {
  data: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly fcmService: FcmService,
  ) {}

  @Sse('stream')
  stream(): Observable<MessageEvent> {
    return this.notificationsService.getNotificationStream().pipe(
      map((notification: NotificationDto) => ({ data: JSON.stringify(notification) })),
    );
  }

  @Get()
  async findAll(): Promise<NotificationDto[]> {
    return this.notificationsService.findAll();
  }

  @Get('unread')
  async findUnread(): Promise<NotificationDto[]> {
    return this.notificationsService.findUnread();
  }

  @Get('unread/count')
  async countUnread(): Promise<{ count: number }> {
    const count = await this.notificationsService.countUnread();
    return { count };
  }

  @Post()
  async create(@Body() dto: CreateNotificationDto): Promise<NotificationDto> {
    return this.notificationsService.create(dto);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string): Promise<void> {
    return this.notificationsService.markAsRead(id);
  }

  @Post('mark-all-read')
  async markAllAsRead(): Promise<void> {
    return this.notificationsService.markAllAsRead();
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.notificationsService.remove(id);
  }

  // Endpoint de test uniquement disponible en développement
  @Post('test-push')
  async testPush(@Body() body: { token: string }): Promise<{ success: boolean }> {
    if (process.env.NODE_ENV === 'production') {
      return { success: false };
    }
    if (!body.token || typeof body.token !== 'string') {
      return { success: false };
    }
    const success = await this.fcmService.sendToToken(body.token, {
      title: 'Test FamilyHub 🎉',
      body: 'Les notifications push fonctionnent !',
    });
    return { success };
  }
}
