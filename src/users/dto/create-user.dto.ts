import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: '사용자 이름',
    example: 'testuser'
  })
  username: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: '비밀번호',
    example: 'testpass'
  })
  password: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt({ message: '잔액은 정수여야 합니다' })
  @Min(0, { message: '잔액은 0 이상이어야 합니다' })
  @ApiProperty({
    description: '초기 잔액',
    minimum: 0,
    example: 50000
  })
  balance: number;
} 