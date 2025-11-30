// src/modules/category/sub-services/category.create.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CategoryCreateInput } from '../../../schemas/category/category.zod';

@Injectable()
export class CategoryCreateService {
  constructor(private prisma: PrismaService) {}

  async create(input: unknown) {
    const data = CategoryCreateInput.parse(input);

    // Parent check
    if (data.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    // Unique slug check
    const existing = await this.prisma.category.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      throw new BadRequestException('Slug already exists');
    }

    return this.prisma.category.create({
      data,
    });
  }
}
