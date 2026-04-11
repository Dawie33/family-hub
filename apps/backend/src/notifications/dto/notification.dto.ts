import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum NotificationType {
  EVENT_REMINDER = 'event_reminder',
  SHOPPING_LIST = 'shopping_list',
  BRIEFING = 'briefing',
  INFO = 'info',
}

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsString()
  event_id?: string;

  @IsOptional()
  data?: Record<string, unknown>;
}

export class NotificationDto {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  event_id?: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: Date;
}
