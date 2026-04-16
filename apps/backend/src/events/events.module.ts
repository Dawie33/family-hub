import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { EventRemindersService } from './event-reminders.service';
import { FcmModule } from '../fcm/fcm.module';

@Module({
  imports: [FcmModule],
  controllers: [EventsController],
  providers: [EventsService, GoogleCalendarService, EventRemindersService],
  exports: [EventsService],
})
export class EventsModule {}
