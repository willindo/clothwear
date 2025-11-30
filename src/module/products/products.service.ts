// src/modules/products/products.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ProductBaseService } from './product-base.service';
import { ProductAttributeService } from './sub-services/product-attribute.service';
import { ProductAttributesService } from './product-attributes.service';
import { ProductVariantService } from './sub-services/product-variant.service';
import { ProductVariantsService } from './product-variants.service';
import { ProductInventoryService } from './product-inventory.service';
import { ProductQueryService } from './product-query.service';
import { ProductRulesService } from './product-rules.service';
import { CategoryRuleService } from './sub-services/category-rule.service';
import { ProductSearchService } from './product-search.service'; // indexing/search wrapper
import { CATEGORY_RULES } from '../../schemas/product/category.rules';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly base: ProductBaseService,
    private readonly attrService: ProductAttributeService,
    private readonly attributesService: ProductAttributesService,
    private readonly variantPrep: ProductVariantService,
    private readonly variantsHelper: ProductVariantsService,
    private readonly inventory: ProductInventoryService,
    private readonly queryBuilder: ProductQueryService,
    private readonly rules: ProductRulesService,
    private readonly categoryRuleService: CategoryRuleService,
    private readonly productSearchService: ProductSearchService,
  ) {}

  // --- small helpers ----------------------------------------------------

  private slugify(input?: string) {
    if (!input) return null;
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private async resolveCategorySlugFromInput(input: {
    categoryId?: string;
    categorySlug?: string;
  }) {
    if (input?.categorySlug) return input.categorySlug;
    if (input?.categoryId) {
      return this.categoryRuleService.resolveCategorySlug({
        id: input.categoryId,
      });
    }
    return null;
  }

  // Emit event hook placeholder (consumers can override by DI in future)
  // Currently we perform indexing + log; you can replace with real event bus.
  private async onProductCreated(product: any) {
    try {
      const variants = Array.isArray(product.variants)
        ? product.variants
        : await this.prisma.productVariant.findMany({
            where: { productId: product.id },
          });
      const doc = this.queryBuilder.buildSearchDocument(product, variants);
      await this.productSearchService.onProductCreated(product.id);
    } catch (err) {
      this.logger.warn(
        'Product created but indexing failed: ' + (err as any)?.message,
      );
    }
  }

  private async onProductUpdated(product: any) {
    try {
      const variants =
        product.variants ??
        (await this.prisma.productVariant.findMany({
          where: { productId: product.id },
        }));
      const doc = this.queryBuilder.buildSearchDocument(product, variants);
      await this.productSearchService.onProductUpdated(product.id);
    } catch (err) {
      this.logger.warn(
        'Product updated but re-indexing failed: ' + (err as any)?.message,
      );
    }
  }

  private async onProductDeleted(productId: string) {
    try {
      await this.productSearchService.onProductDeleted(productId);
    } catch (err) {
      this.logger.warn(
        'Product deleted but index removal failed: ' + (err as any)?.message,
      );
    }
  }

  // --- CREATE -----------------------------------------------------------

  /**
   * Full product create pipeline:
   *  - normalize product attributes
   *  - check category-level allowed/required attributes
   *  - prepare variants (validate attributes, enforce size-type, SKU uniqueness)
   *  - create product + nested attributes + nested variants + nested inventory (transactional)
   *  - index product (async best-effort via onProductCreated)
   */
  async createProduct(input: any) {
    // Basic required checks
    if (!input || !input.title) {
      throw new BadRequestException('title is required');
    }

    // Resolve category slug (if provided by id)
    const categorySlug = await this.resolveCategorySlugFromInput({
      categoryId: input.categoryId,
      categorySlug: input.categorySlug,
    });

    // 1) Normalize product attributes
    const normalizedProductAttrs =
      await this.attrService.normalizeProductAttributes(input.attributes ?? []);

    // 2) Load category attribute metadata (for UI/rules) and validate allowed/required
    let categoryAttrs: any[] = [];
    if (categorySlug) {
      categoryAttrs =
        await this.attributesService.loadCategoryAttributes(categorySlug);

      const check = this.attributesService.checkCategoryRules(
        categoryAttrs,
        normalizedProductAttrs.map((a) => ({
          attributeSlug: a.attributeSlug,
          value: a.value,
        })),
      );
      if (!check.ok) {
        throw new BadRequestException({
          message: 'Category attribute validation failed',
          errors: check.errors,
        });
      }

      // Apply static category rules (if present) using categoryRuleService
      await this.categoryRuleService.enforceForProduct(
        { slug: categorySlug },
        normalizedProductAttrs.map((a) => ({ attributeSlug: a.attributeSlug })),
        (input.variants || []).map(
          (v: any) =>
            // ProductVariantService.variantAttrsFromNormalized?.(
            CategoryRuleService.variantAttrsFromNormalized?.(
              v.attributes ?? [],
            ) ?? [],
        ),
      );
    }

    // 3) Prepare variants (normalize + validate + enforce size type + check SKU duplicates)
    const staticRule = categorySlug ? CATEGORY_RULES[categorySlug] : undefined;
    const sizeType = staticRule?.enforceSizeType ?? null;

    const preparedVariants = await this.variantPrep.prepareVariantsForCreate(
      input.variants ?? [],
      {
        categorySlug: categorySlug ?? undefined,
        sizeType: sizeType ?? null,
      },
    );

    // 4) Ensure input-level variant uniqueness (attribute combinations)
    // Convert normalized variants (we expect variantPrep returns Prisma-ready attr payloads inside)
    // But productVariantsService expects normalized shape; for safety we run uniqueness on `input.variants`
    this.variantsHelper.ensureUniqueVariants(
      (input.variants ?? []).map((v: any) => ({
        attributes: v.attributes ?? [],
      })),
    );

    // 5) Build Prisma payloads
    const productSlug = input.slug
      ? this.slugify(input.slug)
      : this.slugify(input.title);
    const productCreateData: any = {
      title: this.base.sanitizeString(input.title),
      slug: productSlug,
      description: input.description ?? null,
      status: input.status ?? 'draft',
      visibility: input.visibility ?? 'visible',
      brandId: input.brandId ?? null,
      // relations: category (connect) if id provided
      ...(input.categoryId
        ? { category: { connect: { id: input.categoryId } } }
        : {}),
      ...(input.categorySlug && !input.categoryId
        ? { category: { connect: { slug: input.categorySlug } } }
        : {}),
      // attributes nested
      attributes:
        normalizedProductAttrs.length > 0
          ? {
              createMany: {
                data: this.attrService.toPrismaCreatePayload(
                  normalizedProductAttrs,
                  {},
                ),
              },
            }
          : undefined,
      // variants nested (preparedVariants are Prisma-ready)
      variants:
        preparedVariants.length > 0 ? { create: preparedVariants } : undefined,
    };

    // Additional fields optionally
    if (input.media)
      productCreateData.media = { createMany: { data: input.media } };

    // 6) Persist transactionally
    const created = await this.prisma.$transaction(async (tx) => {
      // Use tx prisma inside to keep transaction consistent
      const createdProduct = await tx.product.create({
        data: productCreateData,
        include: { variants: true },
      });
      return createdProduct;
    });

    // 7) Async indexing + event hooks (best effort)
    this.onProductCreated(created).catch((e) =>
      this.logger.warn('Indexing hook failed: ' + e?.message),
    );

    return created;
  }

  // --- GET / LIST ------------------------------------------------------

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: { include: { attributes: true, inventoryItems: true } },
        attributes: true,
        media: true,
        productCategories: { include: { category: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    const enrichedVariants = await this.variantsHelper.enrichWithInventory(
      product.variants || [],
    );
    return { ...product, variants: enrichedVariants };
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        variants: { include: { attributes: true, inventoryItems: true } },
        attributes: true,
        media: true,
        productCategories: { include: { category: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    const enrichedVariants = await this.variantsHelper.enrichWithInventory(
      product.variants || [],
    );
    return { ...product, variants: enrichedVariants };
  }

  /**
   * Basic list (paginated) - adapt where/filter shape as needed by your API
   */
  async listProducts(
    opts: { skip?: number; take?: number; filter?: any } = {},
  ) {
    const { skip = 0, take = 20, filter = {} } = opts;
    // Very light filter pass-through; keep heavy filtering in product-query service / search
    const products = await this.prisma.product.findMany({
      where: filter,
      skip,
      take,
      include: {
        variants: { include: { attributes: true, inventoryItems: true } },
        attributes: true,
        media: true,
        productCategories: { include: { category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // attach inventory projection
    const withInv = await Promise.all(
      products.map(async (p) => {
        const enriched = await this.variantsHelper.enrichWithInventory(
          p.variants || [],
        );
        return { ...p, variants: enriched };
      }),
    );

    return withInv;
  }

  // --- UPDATE ----------------------------------------------------------

  /**
   * Full update pipeline:
   * - normalize new product attributes
   * - check category rules
   * - prepare variant changes (create/update/delete)
   * - apply updates transactionally
   * - re-index
   */
  async updateProduct(id: string, input: any) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        productCategories: {
          include: {
            category: { select: { slug: true } },
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Product not found');

    // Resolve category slug (may be updated)
    const categorySlug = input.categorySlug
      ? input.categorySlug
      : input.categoryId
        ? await this.resolveCategorySlugFromInput({
            categoryId: input.categoryId,
          })
        : (existing.productCategories?.[0]?.category?.slug ?? null);

    // 1) Normalize incoming product attributes
    const normalizedProductAttrs =
      await this.attrService.normalizeProductAttributes(input.attributes ?? []);

    // 2) Validate category-level rules
    if (categorySlug) {
      const categoryAttrs =
        await this.attributesService.loadCategoryAttributes(categorySlug);
      const check = this.attributesService.checkCategoryRules(
        categoryAttrs,
        normalizedProductAttrs.map((a) => ({
          attributeSlug: a.attributeSlug,
          value: a.value,
        })),
      );
      if (!check.ok) {
        throw new BadRequestException({
          message: 'Category attribute validation failed',
          errors: check.errors,
        });
      }
    }

    // 3) Prepare variant changes
    const staticRule = categorySlug ? CATEGORY_RULES[categorySlug] : undefined;
    const sizeType = staticRule?.enforceSizeType ?? null;
    const { toCreate, toUpdate, toDelete } =
      await this.variantPrep.prepareVariantChanges(input.variants ?? [], {
        categorySlug: categorySlug ?? undefined,
        sizeType: sizeType ?? null,
      });

    // 4) Build update payload
    const updateData: any = {};
    if (input.title !== undefined)
      updateData.title = this.base.sanitizeString(input.title);
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.visibility !== undefined)
      updateData.visibility = input.visibility;
    if (input.brandId !== undefined) updateData.brandId = input.brandId;

    // attributes replace: simple approach — delete existing and recreate if attributes provided
    if (input.attributes) {
      updateData.attributes = {
        deleteMany: {},
        createMany: {
          data: this.attrService.toPrismaCreatePayload(
            normalizedProductAttrs,
            {},
          ),
        },
      };
    }

    // variants: apply create/update/delete inside transaction with nested writes
    // Prisma supports nested writes for relation fields; use update with nested operations.
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        // perform deletes
        if (toDelete.length > 0) {
          await tx.productVariant.deleteMany({
            where: { id: { in: toDelete } },
          });
        }

        // perform updates
        for (const u of toUpdate) {
          await tx.productVariant.update({ where: { id: u.id }, data: u.data });
        }

        // perform creates
        if (toCreate.length > 0) {
          // attach productId for created variants via connect; use nested create instead
          // We can either use tx.product.update with variants.createMany but createMany doesn't support nested relations fully
          // Simpler: create each variant with explicit productId
          for (const createPayload of toCreate) {
            await tx.productVariant.create({
              data: { ...createPayload, product: { connect: { id } } },
            });
          }
        }

        // Finally update product-level fields
        const productUpdate = await tx.product.update({
          where: { id },
          data: updateData,
          include: { variants: true },
        });

        return productUpdate;
      });

      // 5) Async hook: re-index
      this.onProductUpdated(updated).catch((e) =>
        this.logger.warn('Reindex hook failed: ' + e?.message),
      );

      return updated;
    } catch (err: any) {
      // Convert unique constraint failures into friendly messages
      if (err?.code === 'P2002') {
        throw new ConflictException(
          'Unique constraint failed: ' + JSON.stringify(err?.meta),
        );
      }
      throw err;
    }
  }

  // --- DELETE ----------------------------------------------------------

  async deleteProduct(id: string) {
    // soft-delete pattern could be used instead; here we perform hard delete
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

    // Delete transactionally: variants, attributes, media, then product
    await this.prisma.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.productAttribute.deleteMany({ where: { productId: id } });
      // await tx.media.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    // Remove from search index
    await this.onProductDeleted(id);

    return { success: true };
  }

  // --- SEARCH (delegated to productSearchService) -----------------------

  async searchProducts(query: string, options: any = {}) {
    return this.productSearchService.searchProducts(query, options);
  }
  // src/modules/products/products.service.ts
  async reindexAllProducts() {
    return this.productSearchService.reindexAll();
  }

  // --- ADDITIONAL: simple SKU lookup ----------------------------------

  async findVariant(productId: string, variantId: string) {
    return this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      include: {
        attributes: true,
        inventoryItems: true,
      },
    });
  }
}
