import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AreasService } from './areas.service';

@ApiTags('areas')
@Controller('areas')
export class AreasController {
  constructor(private readonly areas: AreasService) {}

  @Get()
  findAll() {
    return this.areas.findAll();
  }
}
