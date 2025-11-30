// apps/backend/src/filters/filters.controller.ts
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Controller('filters')
export class FiltersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getFilters() {
    const categories = await this.prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const genders = await this.prisma.product.findMany({
      distinct: ['gender'],
      select: { gender: true },
      where: { gender: { not: null } },
    });

    const sizes = await this.prisma.productSize.findMany({
      distinct: ['size'],
      select: { size: true },
    });

    return {
      categories,
      genders: genders.map((g) => g.gender),
      sizes: sizes.map((s) => s.size),
    };
  }
}
