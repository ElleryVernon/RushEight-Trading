import { ApiProperty } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({ description: 'Name of the item', example: 'Laptop' })
  name: string;

  @ApiProperty({ description: 'Price of the item', example: 1500 })
  price: number;

  @ApiProperty({ description: 'Seller ID for the item', example: 'uuid-of-seller' })
  sellerId: string;
} 