import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @Column('simple-array', { nullable: true })
  images: string[];

  @ManyToOne(() => User)
  user: User;

  @Column('simple-array', { nullable: true })
  likes: string[]; // User IDs

  @Column('simple-json', { nullable: true })
  comments: {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    content: string;
    createdAt: string;
  }[];

  @CreateDateColumn()
  createdAt: Date;
}
