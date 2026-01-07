import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Registration } from './registration.entity';
import { MatchRegistration } from './match-registration.entity';

export enum MatchType {
  TEAM_FRIENDLY = 'TEAM_FRIENDLY',
  PICKUP = 'PICKUP',
  NIGHT = 'NIGHT',
  LEAGUE = 'LEAGUE'
}

@Entity()
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  coverUrl: string;

  @Column({
    type: 'simple-enum', // Use simple-enum for sqlite compatibility if needed, or string
    enum: MatchType,
    default: MatchType.PICKUP
  })
  type: MatchType;

  @Column({ default: 'registering' }) // registering, ongoing, finished
  status: string;

  @Column()
  date: string; // Date range or specific date

  @Column({ nullable: true })
  time: string; // Specific time e.g. "14:00"

  @Column({ nullable: true })
  startTime: Date;

  @Column({ nullable: true })
  endTime: Date;

  @Column({ nullable: true })
  registrationStartTime: Date;

  @Column({ nullable: true })
  registrationEndTime: Date;

  @Column()
  location: string;

  @Column({ nullable: true })
  initiatorId: string;

  @Column({ nullable: true })
  homeTeamId: string;

  @Column({ nullable: true })
  awayTeamId: string;

  @Column({ default: 0 })
  minPlayers: number;

  @Column({ default: 0 })
  maxPlayers: number;

  @Column({ default: 0 })
  currentPlayers: number;

  @Column({ nullable: true })
  teams: string; // e.g. "0/16" or "0/2"

  @Column({ nullable: true })
  format: string; // 5, 8, 11

  @Column({ nullable: true })
  jerseyColor: string;

  @Column({ nullable: true })
  awayJerseyColor: string;

  @Column({ nullable: true })
  rules: string;

  @Column({ nullable: true })
  requirements: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 2 })
  maxTeams: number;

  @Column({ nullable: true })
  score: string;

  @Column({ type: 'text', nullable: true })
  reportContent: string;

  @Column('simple-array', { nullable: true })
  reportImages: string[];

  @Column('simple-json', { nullable: true })
  events: any[];

  @Column('simple-array', { nullable: true })
  tags: string[];

  @OneToMany(() => Registration, registration => registration.match)
  registrations: Registration[];

  @OneToMany(() => MatchRegistration, mr => mr.match)
  teamRegistrations: MatchRegistration[];

  @Column({ default: false })
  reminderSent: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
