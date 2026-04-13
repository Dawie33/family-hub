import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
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
  ],
})
export class AppModule {}
