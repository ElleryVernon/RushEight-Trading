import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Delete,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { ListItemDto } from './dto/list-item.dto';
import { PurchaseItemDto } from './dto/purchase-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('아이템')
@ApiBearerAuth()
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post('list')
  @ApiOperation({
    summary: '아이템 판매 등록',
    description: `
      새로운 아이템을 마켓에 등록.
      sellerId(판매자)는 JWT에서 자동으로 추출.
    `,
  })
  @ApiResponse({
    status: 201,
    description: '아이템 등록 성공',
    schema: {
      example: {
        id: 'uuid',
        name: '메이플 아이템',
        price: 10000,
        isListed: true,
        createdAt: '2024-03-15T12:00:00Z',
        updatedAt: '2024-03-15T12:00:00Z',
        sellerId: 'user-uuid',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '판매자를 찾을 수 없음',
  })
  @UseGuards(JwtAuthGuard)
  async listItem(@Req() req: Request, @Body() listItemDto: ListItemDto) {
    const sellerId = (req.user as any).id;
    if (!sellerId) {
      throw new UnauthorizedException('Invalid user ID');
    }
    return this.itemsService.listItem(sellerId, listItemDto);
  }

  @Get('market')
  @ApiOperation({
    summary: '마켓 아이템 목록 조회',
    description: '현재 판매 중인 모든 아이템 목록을 반환함',
  })
  @ApiResponse({
    status: 200,
    description: '마켓 아이템 목록',
    schema: {
      type: 'array',
      items: {
        example: {
          id: 'uuid',
          name: '메이플 아이템',
          price: 10000,
          isListed: true,
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  findAllMarketItems() {
    return this.itemsService.findAllMarketItems();
  }

  @Get(':id')
  @ApiOperation({
    summary: '단일 아이템 조회',
    description: '특정 아이템의 상세 정보를 조회함',
  })
  @ApiResponse({
    status: 200,
    description: '아이템 정보',
    schema: {
      example: {
        id: 'uuid',
        name: '메이플 아이템',
        price: 10000,
        isListed: true,
        sellerId: 'seller-uuid',
        buyerId: null,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '아이템을 찾을 수 없음',
  })
  @UseGuards(JwtAuthGuard)
  getItem(@Param('id') id: string) {
    return this.itemsService.getItem(id);
  }

  @Delete(':id/market')
  @ApiOperation({
    summary: '판매 중단',
    description: '마켓에 등록된 아이템을 판매 중단 상태로 변경함',
  })
  @ApiResponse({
    status: 200,
    description: '판매 중단 성공',
  })
  @ApiResponse({
    status: 404,
    description: '아이템을 찾을 수 없음',
  })
  @ApiResponse({
    status: 409,
    description: '이미 판매 중단된 아이템',
  })
  @UseGuards(JwtAuthGuard)
  removeFromMarket(@Param('id') id: string) {
    return this.itemsService.removeItemFromMarket(id);
  }

  @Post('purchase')
  @ApiOperation({
    summary: '아이템 구매',
    description: `
      아이템 구매 프로세스를 실행.
      buyerId(구매자)는 JWT에서 자동으로 추출.
      1. 아이템 판매 상태 확인 (판매 중인지 여부)
      2. 구매자의 잔액이 아이템 가격보다 높은지 확인
      3. 판매자에게 아이템 가격만큼 메소 이전
      4. 구매자에게 아이템 소유권 이전 및 판매 완료 상태로 변경
    `,
  })
  @ApiResponse({
    status: 201,
    description: '구매 성공',
    schema: {
      example: {
        message: '구매 완료',
        itemId: 'uuid',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '아이템/구매자/판매자 미존재',
  })
  @ApiResponse({
    status: 409,
    description: '잔액 부족 또는 이미 판매된 아이템',
  })
  @UseGuards(JwtAuthGuard)
  async purchaseItem(@Req() req: Request, @Body() purchaseItemDto: PurchaseItemDto) {
    const buyerId = (req.user as any).id;
    if (!buyerId) {
      throw new UnauthorizedException('Invalid user ID');
    }
    return this.itemsService.purchaseItem(buyerId, purchaseItemDto);
  }
} 