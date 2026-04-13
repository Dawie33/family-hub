import { Module } from '@nestjs/common'
import { RecipeAiClient } from './recipe-ai.service'

@Module({
  providers: [RecipeAiClient],
  exports: [RecipeAiClient],
})
export class RecipeAiModule {}
