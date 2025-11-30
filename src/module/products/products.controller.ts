// src/modules/products/products.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ProductsService } from './products.service';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { zProductCreateSchema } from '../../schemas/product/product.create.zod';
import { zProductUpdateSchema } from '../../schemas/product/product.update.zod';
import { PaginationSchema } from '../../schemas/shared/pagination.zod';

import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import z from 'zod';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /* -------------------------------------------------------------------------- */
  /* GET /products                                                              */
  /* -------------------------------------------------------------------------- */
  @Get()
  async listProducts(
    @Query(new ZodValidationPipe(PaginationSchema))
    query: z.infer<typeof PaginationSchema>,
  ) {
    return this.productsService.listProducts();
  }
  /* -------------------------------------------------------------------------- */
  /* REINDEX ALL PRODUCTS                                                       */
  /* -------------------------------------------------------------------------- */
  @Post('reindex')
  async reindexAllProducts() {
    await this.productsService.reindexAllProducts();
    return { message: 'Product reindexing started.' };
  }
  /* -------------------------------------------------------------------------- */
  /* SEARCH /products                                                              */
  /* -------------------------------------------------------------------------- */
  @Get('search')
  async searchProducts(@Query('q') q: string, @Query() options: any) {
    return this.productsService.searchProducts(q, options);
  }
  /* -------------------------------------------------------------------------- */
  /* GET /products/:id                                                          */
  /* -------------------------------------------------------------------------- */
  @Get(':id')
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.getProductById(id);
  }

  /* -------------------------------------------------------------------------- */
  /* POST /products                                                             */
  /* -------------------------------------------------------------------------- */
  @Post()
  async createProduct(
    @Body(new ZodValidationPipe(zProductCreateSchema))
    dto: CreateProductDto,
  ) {
    return this.productsService.createProduct(dto);
  }

  /* -------------------------------------------------------------------------- */
  /* PATCH /products/:id                                                        */
  /* -------------------------------------------------------------------------- */
  @Patch(':id')
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(zProductUpdateSchema))
    dto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(id, dto);
  }

  /* -------------------------------------------------------------------------- */
  /* DELETE /products/:id                                                       */
  /* -------------------------------------------------------------------------- */
  @Delete(':id')
  async deleteProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.deleteProduct(id);
  }

  /* ========================================================================== */
  /* VARIANT SUBROUTES                                                          */
  /* ========================================================================== */
  /* Get all variants for a product */
  @Get(':id/variants')
  async listVariants(@Param('id', ParseUUIDPipe) id: string) {
    const product = await this.productsService.getProductById(id);
    return product.variants;
  }
  @Get(':id/variants/:variantId')
  async getVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    return this.productsService.findVariant(id, variantId);
  }
}
