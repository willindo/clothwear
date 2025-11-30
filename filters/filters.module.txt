// apps/backend/src/filters/filters.module.ts
import { Module } from '@nestjs/common';
import { FiltersController } from './filters.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FiltersController],
})
export class FiltersModule {}
