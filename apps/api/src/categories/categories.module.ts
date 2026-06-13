import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoryGroupsService } from './category-groups.service';
import { CategoryTemplatesService } from './category-templates.service';
import { BusinessCategoriesService } from './business-categories.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [CategoriesController],
  providers: [
    CategoryGroupsService,
    CategoryTemplatesService,
    BusinessCategoriesService,
  ],
  exports: [
    CategoryGroupsService,
    CategoryTemplatesService,
    BusinessCategoriesService,
  ],
})
export class CategoriesModule {}
