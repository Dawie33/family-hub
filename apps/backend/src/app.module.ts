import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { DatabaseModule } from './database/database.module'
import { AIModule } from './ai/ai.module'
import { AgentsModule } from './agents/agents.module'
import { ChatModule } from './chat/chat.module'
import { EventsModule } from './events/events.module'
import { BriefingsModule } from './briefings/briefings.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PdfModule } from './pdf/pdf.module'
import { WeatherModule } from './weather/weather.module'
import { RecipesModule } from './recipes/recipes.module'
import { TrainingCampModule } from './training-camp/training-camp.module'
import { RecipeAiModule } from './recipe-ai/recipe-ai.module'
import { ShoppingModule } from './shopping/shopping.module'
import { FcmModule } from './fcm/fcm.module'
import { GmailModule } from './gmail/gmail.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AIModule,
    AgentsModule,
    ChatModule,
    EventsModule,
    BriefingsModule,
    NotificationsModule,
    PdfModule,
    WeatherModule,
    RecipesModule,
    TrainingCampModule,
    RecipeAiModule,
    ShoppingModule,
    FcmModule,
    GmailModule,
  ],
})
export class AppModule {}
