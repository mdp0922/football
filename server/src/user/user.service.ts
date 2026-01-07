import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async search(keyword: string) {
    if (!keyword) return [];
    
    const users = await this.userRepository.find({
      where: [
        { name: Like(`%${keyword}%`) },
        { phone: Like(`%${keyword}%`) },
        { realName: Like(`%${keyword}%`) }
      ],
      take: 20 // Limit results
    });

    return users.map(user => {
      const { password, ...result } = user;
      return result;
    });
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    // 不返回密码
    const { password, ...result } = user;
    return result;
  }

  async updateProfile(userId: string, updateData: Partial<User>) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 过滤敏感字段，防止被恶意修改
    const {
      id,
      phone,
      password,
      role,
      certificationStatus,
      certificationFiles,
      certifications,
      ...allowedUpdates
    } = updateData;

    // 特殊处理 sportsProfile (如果是部分更新)
    if (allowedUpdates.sportsProfile) {
      user.sportsProfile = {
        ...(user.sportsProfile || {}),
        ...allowedUpdates.sportsProfile
      };
      delete allowedUpdates.sportsProfile;
    }

    // 如果更新了五芒星数据，重置审核状态
    if (allowedUpdates.radarData) {
      user.radarDataStatus = 'pending';
    }

    Object.assign(user, allowedUpdates);
    await this.userRepository.save(user);

    const { password: _, ...result } = user;
    return result;
  }

  async submitAuth(userId: string, authData: any) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 更新基础信息
    if (authData.name) user.name = authData.name;
    if (authData.realName) user.realName = authData.realName; // 认证姓名同步到 realName
    if (authData.idCard) user.idCard = authData.idCard;

    // 更新运动档案
    user.sportsProfile = {
      ...(user.sportsProfile || {}),
      gender: authData.gender,
      age: authData.age,
      footballAge: authData.footballAge, // 新增
      position: authData.position,
      intro: authData.intro,
    };

    // 自动通过认证 (简化流程) - 仅作为基础认证
    // 如果已有其他认证，保留；如果没有，设为基础认证
    // 这里我们不再直接覆盖 certification 字段，而是添加到 certifications 数组
    const currentCerts = user.certifications || [];
    // 基础实名认证不作为特殊标签展示，或者可以加一个 "实名认证"
    // user.certification = '已认证'; // Deprecated field
    
    // 我们保留 certification 字段作为向后兼容，或者显示 "基础认证"
    // 但根据需求，我们有 "足协会员" 等高级认证。
    // 实名认证本身通常不作为炫耀性标签，但可以加一个 "已实名"
    // 暂时不改动 certifications 列表，除非是特定认证申请
    
    // 处理教练/裁判认证申请
    if (authData.applyFor) {
      user.certificationStatus = 'pending';
      user.certificationFiles = authData.files || [];
      // 记录申请类型，暂存于 certifications (或者加一个 applyingFor 字段? 简单起见，我们假设前端提交申请)
      // 实际上，应该有一个单独的申请表。但为了简化，我们复用 User 实体字段
      // 我们在 user.entity.ts 中加了 certificationStatus
      // 我们还需要知道申请的是什么。
      // 可以在 certificationStatus 中存 "pending:Referee" ? 
      // 或者加一个 applyingCert 字段。
      // 让我们复用 certificationStatus = 'pending'，并在某处记录申请类型。
      // 简单做法：存入 user.certificationFiles，管理员后台看到有文件就审核。
      // 但管理员需要知道是申裁判还是教练。
      // 我们可以约定：applyFor 字段存在时，存入 metadata 或 temporary field.
      // 但 Entity 没有 extra field.
      // 让我们在 user.entity.ts 增加 applyingCert 字段
    }

    await this.userRepository.save(user);
    
    const { password: _, ...result } = user;
    return result;
  }

  async applyCertification(userId: string, type: string, files: string[], level?: string, realName?: string, idCard?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    
    user.certificationStatus = `pending:${type}`; // e.g. "pending:裁判员"
    user.certificationFiles = files;
    
    if (realName) user.realName = realName;
    if (idCard) user.idCard = idCard;
    
    if (type === '裁判员') {
        user.refereeLevel = level;
    } else if (type === '教练员') {
        user.coachLevel = level;
    }
    
    return this.userRepository.save(user);
  }

  async deleteAccount(userId: string) {
    return this.userRepository.delete(userId);
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    // Dynamic import to avoid issues if bcrypt not available globally in this context (though it should be)
    // or just use the same import as AuthService
    const bcrypt = require('bcryptjs'); 
    
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    // Verify old password
    let isMatch = false;
    try {
        isMatch = await bcrypt.compare(oldPass, user.password);
    } catch(e) {}

    if (!isMatch && user.password === oldPass) {
        isMatch = true; // Allow plain text old password
    }

    if (!isMatch) {
        throw new Error('旧密码错误');
    }

    user.password = await bcrypt.hash(newPass, 10);
    return this.userRepository.save(user);
  }
}
