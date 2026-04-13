import { Module } from '@nestjs/common'
import { RecipeAiClient } from './recipe-ai.service'
import { RecipeAiController } from './recipe-ai.controller'

@Module({
  controllers: [RecipeAiController],
  providers: [RecipeAiClient],
  exports: [RecipeAiClient],
})
export class RecipeAiModule {}
