import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min } from 'class-validator';

/**
 * 아이템 등록 DTO
 *
 */
export class ListItemDto {
  @ApiProperty({
    example: '메이플 전설 무기',
    description: '등록할 아이템의 이름',
  })
  @IsString()
  itemName: string;

  @ApiProperty({
    example: 10000,
    description: '아이템 가격',
  })
  @IsInt()
  @Min(1, { message: '가격은 1 이상이어야 합니다' })
  price: number;
} 