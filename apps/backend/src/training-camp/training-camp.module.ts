import { Global, Module } from '@nestjs/common'
import { TrainingCampClient } from './training-camp.service'

@Global()
@Module({
  providers: [TrainingCampClient],
  exports: [TrainingCampClient],
})
export class TrainingCampModule {}
