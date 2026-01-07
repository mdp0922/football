import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  slogan: string;

  @Column({ default: '暂无介绍' })
  description: string;

  @ManyToOne(() => User)
  captain: User; // 队长 (创始人)

  @Column('simple-array', { nullable: true })
  admins: string[]; // 管理员 ID 列表

  @Column('simple-array', { nullable: true })
  members: string[]; // 队员 ID 列表 (简化版)

  @Column({ nullable: true })
  establishmentDate: Date; // 成立时间

  @Column('simple-json', { nullable: true })
  memberRoles: Record<string, string>; // 队内职务 { userId: role }

  @Column({ nullable: true })
  contactPhone: string; // 联系电话

  @Column({ default: false })
  isCertified: boolean; // 是否官方认证

  @Column('simple-json', { nullable: true })
  honors: {
    id: string;
    title: string;
    date: string;
    image: string;
    description: string;
  }[]; // 球队荣誉

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
