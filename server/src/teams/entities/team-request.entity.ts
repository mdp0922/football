import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Team } from './team.entity';

export enum TeamRequestType {
  JOIN = 'JOIN',
  LEAVE = 'LEAVE'
}

export enum TeamRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

@Entity()
export class TeamRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Team)
  team: Team;

  @Column({
    type: 'simple-enum',
    enum: TeamRequestType
  })
  type: TeamRequestType;

  @Column({
    type: 'simple-enum',
    enum: TeamRequestStatus,
    default: TeamRequestStatus.PENDING
  })
  status: TeamRequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
