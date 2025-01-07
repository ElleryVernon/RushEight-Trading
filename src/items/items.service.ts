import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ListItemDto } from './dto/list-item.dto';
import { PurchaseItemDto } from './dto/purchase-item.dto';

/**
 * 아이템 관련 비즈니스 로직을 처리하는 서비스
 * @class ItemsService
 */
@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 아이템을 판매 목록에 등록
   * 새로운 아이템 레코드를 생성하고 판매자의 인벤토리에 연결함
   * @param listItemDto - 아이템 등록 정보
   * @throws NotFoundException - 판매자를 찾을 수 없음
   */
  async listItem(sellerId: string, listItemDto: ListItemDto) {
    const { itemName, price } = listItemDto;

    if (!sellerId) {
      throw new BadRequestException('판매자 ID는 필수입니다');
    }

    if (price <= 0) {
      throw new BadRequestException('가격은 0보다 커야 합니다');
    }

    // 트렌잭션으로 감싸서 seller 조회와 아이템 생성을 원자적으로 처리
    return this.prisma.$transaction(async (tx) => {
      // 판매자 존재 여부 확인
      const seller = await tx.user.findUnique({
        where: { id: sellerId }
      });

      if (!seller) {
        throw new NotFoundException('판매자를 찾을 수 없습니다');
      }

      // 아이템 생성
      const item = await tx.item.create({
        data: {
          name: itemName,
          price,
          isListed: true,
          sellerId,
        },
        include: {
          seller: true,
        },
      });

      return item;
    });
  }

  /**
   * 현재 마켓에 등록된 모든 아이템 조회
   */
  async findAllMarketItems() {
    return this.prisma.item.findMany({
      where: { isListed: true },
    });
  }

  /**
   * 단일 아이템 조회
   * @throws NotFoundException - 아이템을 찾을 수 없음
   */
  async getItem(itemId: string) {
    const item = await this.prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('아이템을 찾을 수 없음');
    }
    return item;
  }

  /**
   * 마켓에서 아이템 제거 (삭제가 아닌 목록 해제)
   * @throws ConflictException - 이미 목록에서 제거된 아이템
   */
  async removeItemFromMarket(itemId: string) {
    const item = await this.getItem(itemId);
    if (!item.isListed) {
      throw new ConflictException('이미 목록에서 제거된 아이템');
    }
    return this.prisma.item.update({
      where: { id: itemId },
      data: { isListed: false },
    });
  }

  /**
   * 아이템 구매 프로세스
   * 1. Prisma 트랜잭션 시작
   * 2. 아이템 상태를 listed에서 unlisted로 변경 (동시성 체크)
   * 3. 동시성 충돌 시 예외 발생
   * 4. 구매자/판매자 간 메소 이전
   * 5. 아이템 소유권 이전
   * 6. 트랜잭션 커밋
   * 
   * @throws NotFoundException - 아이템/구매자/판매자 미존재
   * @throws ConflictException - 잔액 부족 또는 이미 판매된 아이템
   */
  async purchaseItem(buyerId: string, purchaseItemDto: PurchaseItemDto) {
    const { itemId } = purchaseItemDto;
    if (!itemId) {
      throw new BadRequestException('아이템 ID는 필수입니다');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. 구매자와 아이템 정보 조회
      const [buyer, item] = await Promise.all([
        tx.user.findUnique({
          where: { id: buyerId },
          select: { id: true, balance: true }
        }),
        tx.item.findUnique({
          where: { id: itemId },
          select: { 
            id: true, 
            price: true, 
            sellerId: true, 
            isListed: true 
          }
        })
      ]);

      // 유효성 검증
      if (!buyer) {
        throw new NotFoundException('구매자를 찾을 수 없습니다');
      }
      if (!item) {
        throw new NotFoundException('아이템을 찾을 수 없습니다');
      }
      if (!item.isListed) {
        throw new ConflictException('이미 판매된 아이템입니다');
      }
      if (buyer.balance < item.price) {
        throw new BadRequestException('잔액이 부족합니다');
      }

      // 2. 아이템 락 획득 및 상태 변경
      const lockResult = await tx.item.updateMany({
        where: { 
          id: item.id, 
          isListed: true  // 낙관적 락 조건
        },
        data: { 
          isListed: false, 
          buyerId: buyer.id 
        }
      });

      if (lockResult.count === 0) {
        throw new ConflictException('이미 판매된 아이템입니다');
      }

      // 3. 잔액 조정
      await Promise.all([
        tx.user.update({
          where: { id: buyer.id },
          data: { balance: { decrement: item.price } }
        }),
        tx.user.update({
          where: { id: item.sellerId },
          data: { balance: { increment: item.price } }
        })
      ]);

      return { 
        message: '구매 완료', 
        itemId: item.id 
      };
    });
  }
}