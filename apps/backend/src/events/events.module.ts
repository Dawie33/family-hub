import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { GoogleCalendarService } from './google-calendar.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, GoogleCalendarService],
  exports: [EventsService],
})
export class EventsModule {}
