import { Injectable, Logger } from '@nestjs/common';
import { SearchService } from 'src/search/search.service';

@Injectable()
export class ProductSearchService {
  private readonly logger = new Logger(ProductSearchService.name);

  constructor(private readonly searchService: SearchService) {}

  /**
   * Called after a product is created.
   */
  async onProductCreated(productId: string) {
    this.logger.log(`🔍 Indexing NEW product ${productId}...`);
    await this.searchService.addProduct(productId);
  }

  /**
   * Called after a product is updated.
   */
  async onProductUpdated(productId: string) {
    this.logger.log(`🔍 Updating search index for product ${productId}...`);
    await this.searchService.updateProduct(productId);
  }

  /**
   * Called after a product is deleted.
   */
  async onProductDeleted(productId: string) {
    this.logger.log(`🔍 Removing product ${productId} from search index...`);
    await this.searchService.removeProduct(productId);
  }

  /**
   * Manual full product reindex.
   */
  async reindexAll() {
    this.logger.log('🔄 Reindexing ALL products via ProductSearchService...');
    await this.searchService.reindexAllProducts();
  }
  /**
   * Proxy to underlying Meilisearch search service.
   */
  async searchProducts(query: string, options?: Record<string, any>) {
    return this.searchService.searchProducts(query, options);
  }
}
