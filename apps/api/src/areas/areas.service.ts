import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.area.findMany({ orderBy: [{ city: 'asc' }, { name: 'asc' }] });
  }
}
