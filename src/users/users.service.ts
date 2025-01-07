import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async register(createUserDto: CreateUserDto) {
    const { username, password, balance } = createUserDto;

    // 이미 존재하는 사용자인지 확인함
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      throw new ConflictException('이미 사용 중인 사용자명입니다');
    }

    // bcrypt로 비밀번호 해시화함
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    return this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        balance,
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }
    return user;
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }
}