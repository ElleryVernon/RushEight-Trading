// JWT 설정을 위한 상수
export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'test-secret',
}; 