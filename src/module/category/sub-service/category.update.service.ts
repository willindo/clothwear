// src/modules/category/sub-services/category.update.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CategoryUpdateInput } from '../../../schemas/category/category.zod';

@Injectable()
export class CategoryUpdateService {
  constructor(private prisma: PrismaService) {}

  async update(id: string, input: unknown) {
    const data = CategoryUpdateInput.parse(input);

    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');

    // Prevent self-parent
    if (data.parentId && data.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    // Slug uniqueness
    if (data.slug) {
      const conflict = await this.prisma.category.findUnique({
        where: { slug: data.slug },
      });
      if (conflict && conflict.id !== id) {
        throw new BadRequestException('Slug already exists');
      }
    }

    // Circular parent validation
    if (data.parentId) {
      await this.ensureNoCircularParent(id, data.parentId);
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  /** Checks whether assigning parentId creates a loop */
  async ensureNoCircularParent(categoryId: string, newParentId: string) {
    let current: string | null = newParentId; // FIXED TYPE

    while (current) {
      if (current === categoryId) {
        throw new BadRequestException('Circular parent relationship detected');
      }

      const parent: any = await this.prisma.category.findUnique({
        where: { id: current },
        select: { parentId: true },
      });

      current = parent?.parentId ?? null; // now valid
    }
  }
}
