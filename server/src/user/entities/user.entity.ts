import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('increment')
  _id: number; // 内部自增主键，用于生成简短ID

  @Column({ unique: true, nullable: true })
  id: string; // 对外暴露的ID，基于自增主键生成，最多5位

  @Column({ unique: true })
  phone: string;

  @Column() // 真实业务中应加密存储
  password: string;

  @Column({ nullable: true })
  name: string; // 昵称

  @Column({ nullable: true })
  realName: string; // 真实姓名

  @Column({ nullable: true })
  idCard: string; // 身份证号

  @Column({ nullable: true })
  avatar: string;

  @Column({ default: 'user' }) // user, admin
  role: string;

  @Column({ nullable: true })
  teamId: string; // 当前所属球队 ID

  @Column('simple-array', { nullable: true }) 
  certifications: string[]; // 认证列表：足协会员, 县队成员, 潜力新星, 裁判员, 教练员

  @Column({ nullable: true })
  refereeLevel: string; // 裁判等级：国家一级, 国家二级, 国家三级, 实习

  @Column({ nullable: true })
  coachLevel: string; // 教练等级：职业级, A级, B级, C级, D级, E级

  @Column({ nullable: true })
  certificationStatus: string; // 审核状态：pending, approved, rejected

  @Column('simple-array', { nullable: true })
  certificationFiles: string[]; // 认证文件URL列表

  @Column({ nullable: true })
  jerseyNumber: number; // 球衣号码

  // 运动档案 (简化为 JSON 存储)
  @Column('simple-json', { nullable: true })
  sportsProfile: {
    age?: number;
    footballAge?: number; // 球龄
    gender?: string; // 1=男, 2=女
    position?: string[];
    intro?: string;
  };

  // 统计数据 (简化为 JSON 存储)
  @Column('simple-json', { default: '{}' })
  stats: {
    matches?: number;
    goals?: number;
    assists?: number;
    cards?: number;
  };

  // 个人主页图片
  @Column('simple-array', { nullable: true })
  profileImages: string[];

  // 五芒星数据 (速度, 射门, 传球, 盘带, 防守, 力量)
  @Column('simple-json', { nullable: true })
  radarData: {
    speed?: number;
    shooting?: number;
    passing?: number;
    dribbling?: number;
    defense?: number;
    physical?: number;
  };

  // 五芒星数据审核状态: pending, approved, rejected
  @Column({ default: 'pending' })
  radarDataStatus: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
