import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { MeiliSearch, Index } from 'meilisearch';
import { PrismaService } from 'prisma/prisma.service';

// Use a more specific type if possible, but 'any' is fine for demonstration
type RawProduct = any;

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private readonly indexName = 'products';
  private client: MeiliSearch;
  private index!: Index;

  constructor(private readonly prisma: PrismaService) {
    this.client = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_API_KEY || 'masterKey',
    });
  }

  // Universal fallback poller for task completion (keeps compatibility
  // with various meilisearch SDK versions)
  private async waitForTaskCompletion(
    indexUid: string,
    taskUid: any,
    intervalMs = 200,
  ): Promise<void> {
    const index = this.client.index(indexUid) as any;

    const getTaskFn =
      typeof index.getTask === 'function'
        ? async (uid: any) => index.getTask(uid)
        : typeof (this.client as any).getTask === 'function'
          ? async (uid: any) => (this.client as any).getTask(uid)
          : null;

    if (!getTaskFn) {
      this.logger.warn('⚠️ Meilisearch SDK has no task API — skipping wait.');
      return;
    }

    while (true) {
      let task: any;
      try {
        task = await getTaskFn(taskUid);
      } catch {
        this.logger.warn('⚠️ Could not get task status — continuing.');
        return;
      }

      const status = task?.status ?? task?.status?.state ?? null;
      if (status === 'succeeded' || status === 'processed' || status === 'done')
        return;
      if (status === 'failed' || task?.error) {
        throw new Error(
          `Meilisearch task failed: ${task?.error?.message ?? JSON.stringify(task)}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  async onModuleInit() {
    this.logger.log('🚀 Initializing Meilisearch index...');

    let exists = true;
    try {
      await this.client.index(this.indexName).getRawInfo();
      this.logger.log(`✅ Index '${this.indexName}' already exists.`);
    } catch (e) {
      exists = false;
      this.logger.warn(`⚙️ Index '${this.indexName}' not found. Creating...`);
    }

    if (!exists) {
      const task = await this.client.createIndex(this.indexName, {
        primaryKey: 'id',
      } as any);
      // some SDKs return { taskUid } others { uid } etc — attempt to wait if possible
      const taskUid =
        (task as any).taskUid ?? (task as any).uid ?? (task as any).task?.uid;
      if (taskUid) await this.waitForTaskCompletion(this.indexName, taskUid);
    }

    const readyIndex = this.client.index(this.indexName);

    // set useful default settings — tweak later from env or admin panel
    const settingsTask = await (readyIndex as any).updateSettings({
      searchableAttributes: [
        'title',
        'slug',
        'description',
        'brand',
        'variantsTitles',
        'attributes_values',
        'categories',
        'styles',
      ],
      displayedAttributes: [
        'id',
        'title',
        'slug',
        'description',
        'brand',
        'priceMin',
        'priceMax',
        'stock',
        'categories',
        'styles',
        'media',
        'createdAt',
        'updatedAt',
      ],
      filterableAttributes: [
        'brand',
        'categories',
        'styles',
        'attributes_keys',
        'attributes_values',
        'createdAt',
      ],
      sortableAttributes: ['createdAt', 'priceMin', 'priceMax', 'stock'],
    } as any);

    const settingsTaskUid =
      (settingsTask as any).taskUid ??
      (settingsTask as any).uid ??
      (settingsTask as any).updateId;
    if (settingsTaskUid) {
      try {
        await this.waitForTaskCompletion(this.indexName, settingsTaskUid);
      } catch (e) {
        this.logger.warn('Could not confirm settings update: ' + String(e));
      }
    }

    this.index = readyIndex;
    this.logger.log(`🔧 Index '${this.indexName}' initialized and ready.`);
  }

  // Build a Meilisearch document from a product record (shallow but useful)
  private serializeForSearch(product: RawProduct) {
    const variants = product.variants || [];
    const prices = variants.map(
      (v: { priceCents?: number | null }) => (v?.priceCents ?? 0) / 100,
    );
    const priceMin = prices.length ? Math.min(...prices) : null;
    const priceMax = prices.length ? Math.max(...prices) : null;
    const stock = variants.reduce((sum: number, v: any) => {
      const inv = v.inventoryItems || [];
      const qty = inv.reduce(
        (s: number, it: any) =>
          s + (it.quantityOnHand ?? 0) - (it.reserved ?? 0),
        0,
      );
      return sum + qty;
    }, 0);

    // flatten categories & styles
    const categories = (product.productCategories || [])
      .map((pc: any) => pc.category?.slug ?? pc.category?.name)
      .filter(Boolean);
    const categoriesNames = (product.productCategories || [])
      .map((pc: any) => pc.category?.name)
      .filter(Boolean);

    const styles = (product.styles || [])
      .map((ps: any) => ps.style?.name ?? ps.style?.slug)
      .filter(Boolean);

    // --- ENHANCED ATTRIBUTE HANDLING START ---

    // 1. Extract Product-Level Attributes
    const productAttributes = (product.attributes || []).map((a: any) => {
      // Use slug, then key, then ID as fallback for attribute identifier
      const attributeKey =
        a.attribute?.slug ?? a.attribute?.key ?? a.attributeId;
      // value stored earlier as JSON string in productAttribute.value
      let val = a.value;
      try {
        if (typeof val === 'string') val = JSON.parse(val);
      } catch {
        // keep original
      }
      return { key: attributeKey, value: val };
    });

    // 2. Extract Variant-Level Attributes (e.g., Size, Color)
    const variantAttributes = variants.flatMap((v: any) =>
      (v.variantAttributes || []).map((va: any) => {
        const attributeKey = va.attribute?.slug ?? va.attributeId;
        // va.value is the raw value string
        let val = va.value;
        return { key: attributeKey, value: val };
      }),
    );

    // 3. Combine All Attributes
    const allAttributes = [...productAttributes, ...variantAttributes].filter(
      (a) => a.key,
    );

    // 4. Create key/value arrays for Meilisearch
    const attributes_keys = allAttributes
      .map((a: any) => a.key)
      .filter(Boolean);

    // Flatten all values (including array values from parsed JSON fields)
    const attributes_values = allAttributes.flatMap((a: any) => {
      const value = a.value;
      // If array (from product JSON attribute), use it; otherwise, wrap string value.
      return Array.isArray(value) ? value : [String(value ?? '')];
    });

    // Deduplicate keys and values for cleaner indexing
    const unique_attributes_keys = Array.from(new Set(attributes_keys));
    const unique_attributes_values = Array.from(
      new Set(attributes_values),
    ).filter(Boolean);

    // --- ENHANCED ATTRIBUTE HANDLING END ---

    const media = (product.media || []).map((m: any) => m.url).filter(Boolean);

    const variantsTitles = variants
      .map((v: any) => v.title ?? v.sku ?? '')
      .filter(Boolean);

    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      description: product.description,
      brand: product.brand,
      handle: product.handle ?? null,
      priceMin,
      priceMax,
      variantsCount: variants.length,
      stock,
      categories,
      categoriesNames,
      styles,
      // Use combined attributes for the Meilisearch document
      attributes: allAttributes,
      attributes_keys: unique_attributes_keys,
      attributes_values: unique_attributes_values,
      variantsTitles,
      media,
      createdAt: product.createdAt
        ? new Date(product.createdAt).toISOString()
        : null,
      updatedAt: product.updatedAt
        ? new Date(product.updatedAt).toISOString()
        : null,
    };
  }

  // Full reindex
  async reindexAllProducts() {
    this.logger.log('♻️ Reindexing all products...');

    const products = await this.prisma.product.findMany({
      include: {
        variants: {
          include: {
            inventoryItems: true,
            // 💡 NEW: Include variant attributes for clothwear filtering
            attributes: { include: { attribute: true } },
          },
        },
        productCategories: { include: { category: true } },
        styles: { include: { style: true } },
        attributes: { include: { attribute: true } },
        media: true,
        taxonomyTerms: { include: { term: true } },
      },
    });

    const docs = products.map((p) => this.serializeForSearch(p));

    try {
      // delete all then add (keeps index consistent)
      await (this.index as any).deleteAllDocuments();
    } catch (e) {
      this.logger.warn('Could not deleteAllDocuments: ' + String(e));
    }

    if (docs.length) {
      const res = await (this.index as any).addDocuments(docs);
      const taskUid =
        (res as any).taskUid ?? (res as any).uid ?? (res as any).updateId;
      if (taskUid) {
        try {
          await this.waitForTaskCompletion(this.indexName, taskUid);
        } catch (e) {
          this.logger.warn(
            'Reindex addDocuments task wait failed: ' + String(e),
          );
        }
      }
    }

    this.logger.log(`✅ Reindexed ${docs.length} products`);
  }

  // Add one product
  async addProduct(productId: string) {
    try {
      const p = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          variants: {
            include: {
              inventoryItems: true,
              // 💡 NEW: Include variant attributes
              attributes: { include: { attribute: true } },
            },
          },
          productCategories: { include: { category: true } },
          styles: { include: { style: true } },
          attributes: { include: { attribute: true } },
          media: true,
          taxonomyTerms: { include: { term: true } },
        },
      });
      if (!p) return;
      const doc = this.serializeForSearch(p);
      await (this.index as any).addDocuments([doc]);
      this.logger.log(`🔹 Indexed new product: ${p.id}`);
    } catch (e: any) {
      this.logger.warn(`⚠️ addProduct failed for ${productId}: ${e.message}`);
    }
  }

  // Update product document
  async updateProduct(productId: string) {
    try {
      const p = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          variants: {
            include: {
              inventoryItems: true,
              // 💡 NEW: Include variant attributes
              attributes: { include: { attribute: true } },
            },
          },
          productCategories: { include: { category: true } },
          styles: { include: { style: true } },
          attributes: { include: { attribute: true } },
          media: true,
          taxonomyTerms: { include: { term: true } },
        },
      });
      if (!p) return;
      const doc = this.serializeForSearch(p);
      await (this.index as any).updateDocuments([doc]);
      this.logger.log(`🌀 Updated product index: ${p.id}`);
    } catch (e: any) {
      this.logger.warn(
        `⚠️ updateProduct failed for ${productId}: ${e.message}`,
      );
    }
  }

  // Remove
  async removeProduct(id: string) {
    try {
      await (this.index as any).deleteDocument(id);
      this.logger.log(`🗑️ Removed product from Meilisearch: ${id}`);
    } catch (e: any) {
      this.logger.warn(`⚠️ removeProduct failed for ${id}: ${e.message}`);
    }
  }

  // Manual search helper
  async searchProducts(query: string, options?: Record<string, any>) {
    return await (this.index as any).search(query, options);
  }
}
