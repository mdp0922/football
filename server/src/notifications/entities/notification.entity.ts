import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  TEAM_REQUEST = 'TEAM_REQUEST',
  TEAM_AUDIT = 'TEAM_AUDIT',
  COMMUNITY_LIKE = 'COMMUNITY_LIKE',
  COMMUNITY_COMMENT = 'COMMUNITY_COMMENT',
  MATCH_REMINDER = 'MATCH_REMINDER',
  CERTIFICATION_RESULT = 'CERTIFICATION_RESULT',
}

@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  title: string;

  @Column()
  content: string;

  @Column({
    type: 'simple-enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM
  })
  type: NotificationType;

  @Column({ nullable: true })
  relatedId: string; // Could be teamId, matchId, etc.

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
