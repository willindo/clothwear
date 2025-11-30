// src/modules/category/sub-services/category.delete.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class CategoryDeleteService {
  constructor(private prisma: PrismaService) {}

  async delete(id: string) {
    const children = await this.prisma.category.count({
      where: { parentId: id },
    });

    if (children > 0)
      throw new BadRequestException('Category has subcategories');

    const usage = await this.prisma.productCategory.count({
      where: { categoryId: id },
    });

    if (usage > 0)
      throw new BadRequestException('Category is used by products');

    return this.prisma.category.delete({ where: { id } });
  }
}
