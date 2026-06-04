import { Module } from '@nestjs/common';
import { PopupAdsController } from './popup-ads.controller';
import { PopupAdsService } from './popup-ads.service';

@Module({
  controllers: [PopupAdsController],
  providers: [PopupAdsService],
})
export class PopupAdsModule {}
