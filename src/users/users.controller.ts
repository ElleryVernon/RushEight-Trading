import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '../auth/public.decorator';

@ApiTags('사용자')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: '사용자 등록',
    description: '새로운 사용자를 시스템에 등록함'
  })
  @ApiResponse({
    status: 201,
    description: '사용자 등록 성공 (비밀번호는 응답에 포함되지 않음)',
    schema: {
      example: {
        id: 'uuid',
        username: 'user123',
        balance: 10000,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      }
    }
  })
  @ApiResponse({
    status: 409,
    description: '이미 존재하는 사용자명'
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 데이터'
  })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.register(createUserDto);
  }

  @ApiOperation({
    summary: '사용자 정보 조회',
    description: '특정 ID를 가진 사용자의 상세 정보를 조회함 (비밀번호는 응답에 포함되지 않음)'
  })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 조회 성공',
    schema: {
      example: {
        id: 'uuid',
        username: 'user123',
        balance: 10000,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음'
  })
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @ApiOperation({
    summary: '인증 필요 테스트 엔드포인트',
    description: '인증된 사용자만 접근 가능한 테스트 엔드포인트'
  })
  @ApiResponse({
    status: 200,
    description: '접근 성공',
    schema: {
      example: {
        message: '보호된 라우트에 접근함'
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: '인증되지 않은 접근'
  })
  @UseGuards(AuthGuard('local'))
  @Get('protected/test')
  async protectedEndpoint() {
    return { message: '보호된 라우트에 접근함' };
  }
}