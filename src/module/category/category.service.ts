// src/modules/category/category.service.ts
import { Injectable } from '@nestjs/common';
import { CategoryCreateService } from './sub-service/category.create.service';
import { CategoryUpdateService } from './sub-service/category.update.service';
import { CategoryDeleteService } from './sub-service/category.delete.service';
import { CategoryTreeService } from './sub-service/category.tree.service';

@Injectable()
export class CategoryService {
  constructor(
    private createSvc: CategoryCreateService,
    private updateSvc: CategoryUpdateService,
    private deleteSvc: CategoryDeleteService,
    private treeSvc: CategoryTreeService,
  ) {}

  create(body: unknown) {
    return this.createSvc.create(body);
  }

  update(id: string, body: unknown) {
    return this.updateSvc.update(id, body);
  }

  delete(id: string) {
    return this.deleteSvc.delete(id);
  }

  tree() {
    return this.treeSvc.getTree();
  }
}
