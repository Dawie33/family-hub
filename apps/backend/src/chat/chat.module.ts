import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { AIModule } from '../ai/ai.module';
import { EventsModule } from '../events/events.module';
import { MemoryModule } from '../memory/memory.module';
import { RecipesModule } from '../recipes/recipes.module';
import { RecipeAiModule } from '../recipe-ai/recipe-ai.module';
import { AgentRouterService } from './agent-router.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationContextService } from './conversation-context.service';
import { SearchService } from './services/search.service';

@Module({
  imports: [AgentsModule, AIModule, EventsModule, MemoryModule, RecipesModule, RecipeAiModule],
  controllers: [ChatController],
  providers: [ChatService, AgentRouterService, ConversationContextService, SearchService],
})
export class ChatModule {}
