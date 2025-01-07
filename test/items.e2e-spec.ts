import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../src/prisma.service';

describe('아이템 E2E 테스트 (Items)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  // 테스트에 사용할 토큰들과 ID들
  let sellerToken: string;
  let buyerToken: string;
  let poorBuyerToken: string;
  
  let sellerId: string;
  let buyerId: string;
  let poorBuyerId: string;
  
  let createdItemId: string;
  let expensiveItemId: string;

  beforeAll(async () => {
    try {
      // 1. 앱 초기화
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      prisma = app.get(PrismaService);

      app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }));

      await app.init();

      // 3. 테스트 사용자들 생성 및 토큰 발급
      console.log('⚙️  테스트 사용자 생성 및 토큰 발급 시작');

      // 3.1 판매자 계정 생성 및 토큰 발급
      const sellerRes = await request(app.getHttpServer())
        .post('/users')
        .send({
          username: 'seller',
          password: 'pass1234',
          balance: 0,
        });
      sellerId = sellerRes.body.id;
      
      const sellerLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'seller',
          password: 'pass1234',
        });
      sellerToken = sellerLogin.body.access_token;
      console.log('✅ 판매자 토큰 발급 완료');
      console.log(sellerToken)

      // 3.2 구매자 계정 생성 및 토큰 발급
      const buyerRes = await request(app.getHttpServer())
        .post('/users')
        .send({
          username: 'buyer',
          password: 'pass1234',
          balance: 50000,
        });
      buyerId = buyerRes.body.id;
      
      const buyerLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'buyer',
          password: 'pass1234',
        });
      buyerToken = buyerLogin.body.access_token;
      console.log('✅ 구매자 토큰 발급 완료');
      console.log(buyerToken)

      // 3.3 잔액 부족 구매자 계정 생성 및 토큰 발급
      const poorBuyerRes = await request(app.getHttpServer())
        .post('/users')
        .send({
          username: 'poor-buyer',
          password: 'pass1234',
          balance: 100,
        });
      poorBuyerId = poorBuyerRes.body.id;
      
      const poorBuyerLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'poor-buyer',
          password: 'pass1234',
        });
      poorBuyerToken = poorBuyerLogin.body.access_token;
      console.log('✅ 잔액 부족 구매자 토큰 발급 완료');

      // 4. 테스트용 아이템 생성
      console.log('⚙️  테스트용 아이템 생성 시작');

      // 4.1 일반 가격 아이템 생성
      const itemRes = await request(app.getHttpServer())
        .post('/items/list')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          itemName: '테스트 아이템',
          price: 1000,
        });

      if (!itemRes.body.id) {
        console.error('아이템 생성 실패:', itemRes.body);
        throw new Error('아이템 생성 실패');
      }

      createdItemId = itemRes.body.id;
      console.log('✅ 일반 아이템 생성 완료:', createdItemId);

      // 4.2 고가 아이템 생성
      const expensiveItemRes = await request(app.getHttpServer())
        .post('/items/list')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          itemName: '고가 아이템',
          price: 99999,
        });

      if (!expensiveItemRes.body.id) {
        console.error('고가 아이템 생성 실패:', expensiveItemRes.body);
        throw new Error('고가 아이템 생성 실패');
      }

      expensiveItemId = expensiveItemRes.body.id;
      console.log('✅ 고가 아이템 생성 완료:', expensiveItemId);

    } catch (error) {
      console.error('❌ 테스트 설정 중 오류:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await prisma.$transaction([
            prisma.item.deleteMany({}),
            prisma.user.deleteMany({})
        ]);
      await app.close();
      console.log('✅ 테스트 데이터 정리 완료');
    } catch (error) {
      console.error('❌ 테스트 데이터 정리 중 오류:', error);
    }
  });

  describe('아이템 조회', () => {
    it('마켓의 모든 아이템 목록을 가져옴', async () => {
      const response = await request(app.getHttpServer())
        .get('/items/market')
        .set('Authorization', `Bearer ${buyerToken}`);

      console.log('마켓 아이템 목록:', response.body);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('특정 아이템의 상세 정보를 가져옴', async () => {
      const response = await request(app.getHttpServer())
        .get(`/items/${createdItemId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      console.log('아이템 상세:', response.body);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdItemId);
      expect(response.body.name).toBe('테스트 아이템');
    });
  });

  describe('아이템 등록', () => {
    it('새로운 아이템을 등록함', async () => {
      const response = await request(app.getHttpServer())
        .post('/items/list')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          itemName: '새 아이템',
          price: 2000,
        });

      console.log('새 아이템 등록:', response.body);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('새 아이템');
      expect(response.body.price).toBe(2000);
    });

    it('잘못된 가격으로 아이템 등록 시도 시 실패', async () => {
      const response = await request(app.getHttpServer())
        .post('/items/list')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          itemName: '잘못된 아이템',
          price: -1000,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('아이템 구매', () => {
    it('정상적인 구매 진행', async () => {
      // 새 아이템 생성 (기존 아이템은 이미 구매되었을 수 있음)
      const newItemRes = await request(app.getHttpServer())
        .post('/items/list')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          itemName: '구매 테스트용 아이템',
          price: 1000,
        });

      const response = await request(app.getHttpServer())
        .post('/items/purchase')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          itemId: newItemRes.body.id,
        });

      console.log('구매 응답:', response.body);
      
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('구매 완료');
    });

    it('잔액 부족으로 구매 실패', async () => {
      const response = await request(app.getHttpServer())
        .post('/items/purchase')
        .set('Authorization', `Bearer ${poorBuyerToken}`)
        .send({
          itemId: expensiveItemId,
        });

      console.log('잔액 부족 응답:', response.body);
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('잔액이 부족합니다');
    });

    it('이미 판매된 아이템 구매 시도 시 실패', async () => {
      // 먼저 아이템을 구매
      const newItemRes = await request(app.getHttpServer())
        .post('/items/list')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          itemName: '중복 구매 테스트용 아이템',
          price: 1000,
        });

      await request(app.getHttpServer())
        .post('/items/purchase')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          itemId: newItemRes.body.id,
        });

      // 이미 구매된 아이템을 다시 구매 시도
      const response = await request(app.getHttpServer())
        .post('/items/purchase')
        .set('Authorization', `Bearer ${poorBuyerToken}`)
        .send({
          itemId: newItemRes.body.id,
        });

      console.log('중복 구매 시도 응답:', response.body);
      
      expect(response.status).toBe(409);
      expect(response.body.message).toBe('이미 판매된 아이템입니다');
    });
  });

  describe('동시성 간단 테스트', () => {
    it('동일 아이템에 대한 동시 구매 요청 처리', async () => {
      // 새 테스트용 아이템 생성
      const newItemRes = await request(app.getHttpServer())
        .post('/items/list')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          itemName: '동시성 테스트 아이템',
          price: 1000,
        });

      // 동시에 두 구매자가 구매 시도
      const purchasePromises = [
        request(app.getHttpServer())
          .post('/items/purchase')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({ itemId: newItemRes.body.id }),
        request(app.getHttpServer())
          .post('/items/purchase')
          .set('Authorization', `Bearer ${poorBuyerToken}`)
          .send({ itemId: newItemRes.body.id }),
      ];

      const results = await Promise.all(purchasePromises);
      
      const successCount = results.filter(r => r.status === 201).length;
      const failCount = results.filter(r => r.status === 409).length;

      console.log('동시성 테스트 결과:', results.map(r => ({
        status: r.status,
        body: r.body
      })));
      
      expect(successCount).toBe(1);
      expect(failCount).toBe(1);
    });
  });
});