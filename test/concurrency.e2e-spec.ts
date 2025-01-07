import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('아이템 동시성(원자성) 테스트 (Concurrency)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sellerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);

    // 필요한 파이프 설정
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  beforeEach(async () => {
    // 1. 모든 데이터 삭제 시 트랜잭션 사용
    await prisma.$transaction([
      prisma.item.deleteMany({}),
      prisma.user.deleteMany({})
    ]);

    // 2. 새 판매자 생성
    await request(app.getHttpServer())
      .post('/users')
      .send({
        username: 'seller-concurrency',
        password: 'pass1234',
        balance: 0,
      });
    
    // 3. 판매자 로그인 후 토큰 발급
    const sellerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'seller-concurrency',
        password: 'pass1234',
      });
    sellerToken = sellerLogin.body.access_token;
  });

  afterAll(async () => {
    // 전체 테스트 끝나면 앱 종료
    await app.close();
  });

  it('동일 아이템에 대한 동시 구매 요청 (트랜잭션 원자성 확인)', async () => {
    // 1) 새로 생성한 아이템 (가격 3000원)
    const newItemRes = await request(app.getHttpServer())
      .post('/items/list')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        itemName: '동시성 아이템',
        price: 3000,
      });
    
    console.log('생성된 아이템 응답:', newItemRes.body);
    const itemId = newItemRes.body.id;
    expect(typeof itemId).toBe('string'); // 문자열 타입인지 체크

    // 2) 동시 구매 시도할 Buyer 2명 생성
    // (2.1) 구매자 A(잔액 충분)
    await request(app.getHttpServer())
      .post('/users')
      .send({ username: 'buyerA', password: 'pass1234', balance: 20000 });
    const buyerALogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'buyerA', password: 'pass1234' });
    const buyerAToken = buyerALogin.body.access_token;

    // (2.2) 구매자 B(잔액 500원)
    await request(app.getHttpServer())
      .post('/users')
      .send({ username: 'buyerB', password: 'pass1234', balance: 500 });
    const buyerBLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'buyerB', password: 'pass1234' });
    const buyerBToken = buyerBLogin.body.access_token;

    // 3) Promise.all()로 동시에 구매 시도
    const [resA, resB] = await Promise.all([
      request(app.getHttpServer())
        .post('/items/purchase')
        .set('Authorization', `Bearer ${buyerAToken}`)
        .send({ itemId }),
      request(app.getHttpServer())
        .post('/items/purchase')
        .set('Authorization', `Bearer ${buyerBToken}`)
        .send({ itemId }),
    ]);

    // 4) 결과 검증
    const success = [resA, resB].filter(r => r.status === 201);
    const conflictOrFail = [resA, resB].filter(
      r => r.status === 409 || r.status === 400
    );

    expect(success.length).toBe(1);
    expect(conflictOrFail.length).toBe(1);

    // 5) 원자성 확인 - 서버에서 잔액 다시 읽어오기
    const seller = await prisma.user.findUnique({
      where: { username: 'seller-concurrency' },
    });
    const buyerA = await prisma.user.findUnique({
      where: { username: 'buyerA' },
    });
    const buyerB = await prisma.user.findUnique({
      where: { username: 'buyerB' },
    });

    if (success[0].body.message === '구매 완료') {
      // buyerA가 성공
      expect(buyerA?.balance).toBe(17000); // 2만원 → 17000
      expect(buyerB?.balance).toBe(500);   // 변동 없음
      expect(seller?.balance).toBe(3000);  // 판매자 수익
    } else {
      // buyerB가 성공 - 이론상 희박하나, 대비
      expect(buyerB?.balance).toBe(500 - 3000); // 음수가 되어야 하지만 실패해야 정상
      expect(buyerA?.balance).toBe(20000);
    }
  });

  it('동시에 5명 구매 시도 (1명 성공, 나머지 4명 실패)', async () => {
    // 새 아이템 생성 (가격 2000원)
    const itemRes = await request(app.getHttpServer())
      .post('/items/list')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        itemName: '5명 동시 구매 테스트 아이템',
        price: 2000,
      });
    console.log('5명 동시 구매용 아이템:', itemRes.body);
    const itemId = itemRes.body.id;
    expect(typeof itemId).toBe('string');

    // 5명의 구매자 생성 (모두 5000원 보유)
    const buyerTokens: string[] = [];
    const buyerUsernames: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const username = `multi-buyer-${i}`;
      buyerUsernames.push(username);
      await request(app.getHttpServer())
        .post('/users')
        .send({ username, password: 'pass1234', balance: 5000 });
      const buyerLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username, password: 'pass1234' });
      buyerTokens.push(buyerLogin.body.access_token);
    }

    // 5명이 동시에 구매 시도
    const purchaseRequests = buyerTokens.map(token =>
      request(app.getHttpServer())
        .post('/items/purchase')
        .set('Authorization', `Bearer ${token}`)
        .send({ itemId })
    );

    const results = await Promise.all(purchaseRequests);

    const successCount = results.filter(r => r.status === 201).length;
    const conflictCount = results.filter(r => r.status === 409).length;

    // 하나는 구매 성공, 나머지는 이미 판매됨(409)
    expect(successCount).toBe(1);
    expect(conflictCount).toBe(4);

    // 실제로 구매 성공한 user를 조회 (item.buyerId)
    const seller = await prisma.user.findUnique({
      where: { username: 'seller-concurrency' },
    });
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { buyer: true },
    });

    // 성공자: balance=3000, 판매자 balance=2000, isListed=false
    expect(item?.buyerId).toBeDefined();
    const actualBuyer = await prisma.user.findUnique({
      where: { id: item?.buyerId || '' },
    });
    expect(actualBuyer?.balance).toBe(3000);
    expect(seller?.balance).toBe(2000);
    expect(item?.isListed).toBe(false);

    // 실패한 구매자들의 잔액이 그대로 5000원인지 확인
    const failedBuyers = await Promise.all(
      buyerUsernames
        .filter(username => username !== actualBuyer?.username)
        .map(username => 
          prisma.user.findUnique({ where: { username } })
        )
    );

    failedBuyers.forEach(buyer => {
      expect(buyer?.balance).toBe(5000); // 실패한 구매자들의 잔액은 변동 없어야 함
    });
  });
});