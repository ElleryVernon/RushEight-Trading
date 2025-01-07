import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * 아이템 구매 DTO
 * 
 */
export class PurchaseItemDto {
  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    description: '구매할 아이템의 UUID',
  })
  @IsString()
  itemId: string;
} 