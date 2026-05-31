import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AreasModule } from './areas/areas.module';
import { BusinessesModule } from './businesses/businesses.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { DriversModule } from './drivers/drivers.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';
import { GatewayModule } from './gateway/gateway.module';
import { UploadsModule } from './uploads/uploads.module';
import { AddressesModule } from './addresses/addresses.module';
import { SettingsModule } from './settings/settings.module';
import { ReportsModule } from './reports/reports.module';
import { TagsModule } from './tags/tags.module';
import { BannersModule } from './banners/banners.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AreasModule,
    BusinessesModule,
    ProductsModule,
    OrdersModule,
    DriversModule,
    PaymentsModule,
    ReviewsModule,
    UsersModule,
    GatewayModule,
    UploadsModule,
    AddressesModule,
    SettingsModule,
    ReportsModule,
    TagsModule,
    BannersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
