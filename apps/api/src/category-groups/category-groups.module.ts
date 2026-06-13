import { Module } from '@nestjs/common';
import { CategoryGroupsService } from './category-groups.service';
import {
  AdminCategoryGroupsController,
  AdminCategoryTemplatesController,
  BusinessCategoriesController,
  BusinessPublicCategoriesController,
} from './category-groups.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [PrismaModule, AuthModule, UploadsModule],
  providers: [CategoryGroupsService],
  controllers: [
    AdminCategoryGroupsController,
    AdminCategoryTemplatesController,
    BusinessCategoriesController,
    BusinessPublicCategoriesController,
  ],
  exports: [CategoryGroupsService],
})
export class CategoryGroupsModule {}
