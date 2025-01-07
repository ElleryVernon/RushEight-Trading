# 🎮 게임 유사 거래소 시스템

## 개요
NestJS와 Prisma를 사용하여 구축된 고성능, 프로덕션급 거래 시스템으로, 게임 거래 시스템과 유사한 핵심 마켓플레이스 기능을 구현. 데이터 일관성을 유지하고 경합 상태를 방지하면서 ACID 보장을 통해 동시 아이템 거래를 처리.

## 🏗 아키텍처

### 기술 스택
- **프레임워크**: NestJS
- **데이터베이스**: PostgreSQL
- **ORM**: Prisma
- **인증**: JWT
- **API 문서화**: Swagger/OpenAPI
- **테스팅**: Jest

### 주요 기능
- 아이템 거래를 위한 원자적 트랜잭션
- 동시 구매 처리
- JWT 기반 인증
- 역할 기반 액세스 제어
- 충돌 해결을 위한 낙관적 잠금
- 종합적인 E2E 테스트

## 🔒 보안 기능

- bcrypt를 사용한 비밀번호 해싱
- JWT 토큰 기반 인증
- class-validator를 사용한 요청 유효성 검사
- 가드를 사용한 경로 보호
- 환경 변수 관리

## 💾 데이터 모델

### User
```prisma
model User {
  id            String    @id @default(uuid())
  username      String    @unique
  password      String    
  balance       Int       @default(0)
  sellingItems  Item[]    @relation("SellingItems")
  boughtItems   Item[]    @relation("BoughtItems")
}
```

### Item
```prisma
model Item {
  id        String   @id @default(uuid())
  name      String
  price     Int
  isListed  Boolean  @default(true)
  seller    User     @relation("SellingItems", fields: [sellerId], references: [id])
  sellerId  String
  buyer     User?    @relation("BoughtItems", fields: [buyerId], references: [id])
  buyerId   String?
}
```

## 🔄 거래 흐름
1. **리스팅**: 판매자는 아이템을 원자적으로 생성하여 리스팅할 수 있음.
2. **구매**: 
   - 낙관적 락은 중복 판매를 방지.
   - 잔액 확인은 초과 인출을 방지.
   - 모든 작업은 트랜잭션으로 묶여 있음.
3. **유효성 검사**: 종합적인 입력 유효성 검사 및 오류 처리가 이루어짐.

## 🧪 테스팅
- 동시 시나리오에 대한 광범위한 E2E 테스트
- 트랜잭션 원자성 검증
- 경합 상태에 대한 엣지 케이스 처리
- 격리된 테스트 데이터베이스 환경

### 테스트 실행
```bash
# 모든 테스트 실행
npm run test:e2e

# 특정 테스트 스위트 실행
npm run test:e2e items.e2e-spec.ts
```

## 🚀 성능 고려 사항

### 최적화
- 가능한 경우 병렬 데이터베이스 쿼리
- Prisma select를 사용한 선택적 필드 로딩
- 빠른 조회를 위한 인덱싱된 필드
- 데이터베이스 액세스를 위한 연결 풀링

### 동시성 처리
- 아이템 구매를 위한 낙관적 잠금
- 데이터 일관성을 위한 트랜잭션 격리
- 구매 흐름에서 경합 상태 방지

## 📈 확장성 고려 사항

### 현재 제한 사항
- 단일 데이터베이스 인스턴스
- 인메모리 세션 스토리지
- 로컬 파일 시스템 종속성

### 향후 개선 사항
- 데이터베이스 샤딩 구현
- 캐싱을 위한 Redis 추가
- Kubernetes로 배포
- 이벤트 소싱 구현
- 실시간 알림 추가

## 🛠 개발 설정

```bash
# 의존성 설치
npm install

# 환경 설정
cp .env.example .env

# 데이터베이스 마이그레이션 실행
npx prisma migrate dev

# 개발 서버 시작
npm run start:dev
```

## 📚 API 문서
개발 모드에서 실행할 때 `/api` 엔드포인트에서 볼 수 있어요.

## 🔐 환경 변수
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
JWT_SECRET="your-secret-key"
```

## 📝 라이선스
MIT