import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Match } from './match.entity';

@Entity()
export class Registration {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Match, match => match.registrations)
  match: Match;

  @Column({ default: 'pending' }) // pending, approved, rejected
  status: string;

  @Column({ nullable: true })
  teamId: string;

  @Column({ nullable: true })
  side: string; // 'HOME', 'AWAY'

  @Column('simple-json', { nullable: true })
  playerInfo: {
    name: string;
    idCard: string;
    number: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
