import { Module } from '@nestjs/common';
import { PromotedBusinessesController } from './promoted-businesses.controller';
import { PromotedBusinessesService } from './promoted-businesses.service';

@Module({
  controllers: [PromotedBusinessesController],
  providers: [PromotedBusinessesService],
})
export class PromotedBusinessesModule {}
