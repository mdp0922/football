import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { User } from '../user/entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async login(loginDto: LoginDto) {
    const { phone, password } = loginDto;
    
    // 查找用户
    const user = await this.userRepository.findOne({ where: { phone } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 校验密码 (兼容旧的明文密码)
    let isMatch = false;
    // 1. 尝试作为哈希比对
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (e) {
      // ignore
    }

    // 2. 如果不匹配，尝试明文比对 (迁移策略)
    if (!isMatch && user.password === password) {
      isMatch = true;
      // 自动升级为 Hash
      user.password = await bcrypt.hash(password, 10);
      await this.userRepository.save(user);
    }

    if (!isMatch) {
      throw new UnauthorizedException('密码错误');
    }

    // 简单的 Token 生成 (Base64)
    const access_token = Buffer.from(user.id.toString()).toString('base64');

    return {
      access_token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        certifications: user.certifications,
      },
    };
  }

  async register(loginDto: LoginDto) {
    const { phone, password } = loginDto;

    // 检查是否已存在
    const existUser = await this.userRepository.findOne({ where: { phone } });
    if (existUser) {
      throw new BadRequestException('该手机号已注册');
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const newUser = this.userRepository.create({
      phone,
      password: hashedPassword,
      name: `用户${phone.slice(-4)}`, // 默认昵称
      role: 'user', // 默认为普通用户
      stats: { matches: 0, goals: 0, assists: 0, cards: 0 },
    });

    const savedUser = await this.userRepository.save(newUser);
    
    // 生成简短 ID (基于 _id)
    // 假设从 10000 开始，_id=1 -> 10001
    savedUser.id = (10000 + savedUser._id).toString();
    await this.userRepository.save(savedUser);

    // 注册成功后自动登录
    return this.login(loginDto);
  }
}
