import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class OfferProductDto {
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsString() categoryName?: string;
  @IsNumber() @Min(1) @Max(100) discountPct!: number;
}

export class CreateOfferDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() rules?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsEnum(['INDIVIDUAL', 'SHARED']) type!: 'INDIVIDUAL' | 'SHARED';
  @IsArray() @IsUUID(undefined, { each: true }) businessIds!: string[];
  @IsOptional() @IsArray() @Type(() => OfferProductDto) offerProducts?: OfferProductDto[];
}

export class UpdateOfferDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() rules?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsEnum(['INDIVIDUAL', 'SHARED']) type?: 'INDIVIDUAL' | 'SHARED';
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) businessIds?: string[];
  @IsOptional() @IsArray() @Type(() => OfferProductDto) offerProducts?: OfferProductDto[];
}
