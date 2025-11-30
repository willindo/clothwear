// src/modules/category/sub-services/category.tree.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class CategoryTreeService {
  constructor(private prisma: PrismaService) {}

  async getTree() {
    const all = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    const map = new Map<string, any>();
    const roots: any[] = [];

    // Initialize map
    for (const c of all) {
      map.set(c.id, { ...c, children: [] });
    }

    // Build tree
    for (const c of all) {
      if (!c.parentId) {
        roots.push(map.get(c.id));
      } else {
        const parent = map.get(c.parentId);
        if (parent) parent.children.push(map.get(c.id));
      }
    }

    return roots;
  }
}
