import { Injectable } from '@nestjs/common';
import { BusinessType } from '@shu/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Predefined tags, optionally filtered by section type (FOOD / STORE). */
  findAll(type?: BusinessType) {
    return this.prisma.tag.findMany({
      where: type ? { type } : undefined,
      orderBy: { name: 'asc' },
    });
  }
}
