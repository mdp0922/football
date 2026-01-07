import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { Match } from './match.entity';

@Entity()
export class MatchRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Team)
  team: Team;

  @ManyToOne(() => Match)
  match: Match;

  @Column('simple-array')
  playerIds: string[]; // 报名的球员ID列表

  @Column({ default: 'pending' }) // pending, approved, rejected
  status: string;

  @Column({ type: 'text', nullable: true })
  feedback: string; // 审核意见

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}