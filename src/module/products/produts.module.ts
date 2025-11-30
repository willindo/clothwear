// -----------------------------------------------------------------------------
// src/modules/products/products.module.ts
// -----------------------------------------------------------------------------
import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ProductsService } from './products.service';
import { ProductBaseService } from './product-base.service';
import { ProductAttributesService } from './product-attributes.service';
import { ProductVariantsService } from './product-variants.service';
import { ProductInventoryService } from './product-inventory.service';
import { ProductRulesService } from './product-rules.service';
import { ProductQueryService } from './product-query.service';
import { ProductSearchService } from './product-search.service';
import { SearchModule } from '../../search/search.module';
import { ProductAttributeService } from './sub-services/product-attribute.service';
import { ProductVariantService } from './sub-services/product-variant.service';
import { CategoryRuleService } from './sub-services/category-rule.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [SearchModule],
  controllers: [ProductsController],
  providers: [
    CategoryRuleService,
    PrismaService,
    ProductsService,
    ProductBaseService,
    ProductAttributeService,
    ProductAttributesService,
    ProductVariantService,
    ProductVariantsService,
    ProductInventoryService,
    ProductRulesService,
    ProductQueryService,
    ProductSearchService,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
