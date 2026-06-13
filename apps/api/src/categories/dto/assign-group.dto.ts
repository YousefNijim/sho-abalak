import { IsArray, IsString } from 'class-validator';

export class AssignGroupDto {
  @IsArray()
  @IsString({ each: true })
  businessIds!: string[];
}
