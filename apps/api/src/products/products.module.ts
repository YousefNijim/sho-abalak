import { Module } from '@nestjs/common';
import { ProductsController, ProductCategoriesController } from './products.controller';
import { ProductsService } from './products.service';
import { CategoriesService } from './categories.service';
import { VariantsService } from './variants.service';
import { InventoryService } from './inventory.service';
import { ImportService } from './import.service';

@Module({
  controllers: [ProductsController, ProductCategoriesController],
  providers: [ProductsService, CategoriesService, VariantsService, InventoryService, ImportService],
  exports: [InventoryService],
})
export class ProductsModule {}
