import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Post } from './entities/post.entity';
import { User } from '../user/entities/user.entity';
import { Team } from '../teams/entities/team.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    private notificationsService: NotificationsService,
  ) {}

  async findAll() {
    const posts = await this.postRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    const teamIds = [...new Set(posts.map(post => post.user?.teamId).filter(Boolean))];

    if (teamIds.length > 0) {
      const teams = await this.teamRepository.findBy({ id: In(teamIds) });
      const teamMap = new Map(teams.map(team => [team.id, team.name]));

      posts.forEach(post => {
        if (post.user && post.user.teamId && teamMap.has(post.user.teamId)) {
          (post.user as any).teamName = teamMap.get(post.user.teamId);
          // @ts-ignore
          (post.user as any).teamLogo = teams.find(t => t.id === post.user.teamId)?.logo;
        }
      });
    }

    return posts;
  }

  async create(userId: string, content: string, images: string[]) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const post = this.postRepository.create({
      content,
      images,
      user,
      likes: [],
      comments: []
    });

    return this.postRepository.save(post);
  }

  async like(userId: string, postId: number) {
    const post = await this.postRepository.findOne({ where: { id: postId }, relations: ['user'] });
    if (!post) throw new NotFoundException('帖子不存在');

    if (!post.likes) post.likes = [];
    const index = post.likes.indexOf(userId);
    
    if (index > -1) {
      post.likes.splice(index, 1);
    } else {
      post.likes.push(userId);
      // Notify
      if (post.user.id !== userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        await this.notificationsService.create(
          post.user.id,
          '收获新赞',
          `${user.name || '有人'} 赞了你的动态`,
          NotificationType.COMMUNITY_LIKE,
          postId.toString()
        );
      }
    }
    return this.postRepository.save(post);
  }

  async comment(userId: string, postId: number, content: string, replyToId?: string) {
    const post = await this.postRepository.findOne({ where: { id: postId }, relations: ['user'] });
    if (!post) throw new NotFoundException('帖子不存在');
    
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!post.comments) post.comments = [];
    
    let replyToUser = null;
    if (replyToId) {
      const parent = post.comments.find(c => c.id === replyToId);
      if (parent) {
        replyToUser = { id: parent.userId, name: parent.userName };
      }
    }

    const comment = {
      id: Date.now().toString(),
      userId,
      userName: user.name,
      userAvatar: user.avatar,
      content,
      createdAt: new Date().toISOString(),
      replyToId,
      replyToName: replyToUser ? replyToUser.name : undefined
    };
    post.comments.push(comment);

    // Notify
    if (replyToId && replyToUser) {
      // Notify parent commenter
      if (replyToUser.id !== userId) {
        await this.notificationsService.create(
          replyToUser.id,
          '新回复',
          `${user.name || '有人'} 回复了你的评论: ${content}`,
          NotificationType.COMMUNITY_COMMENT,
          postId.toString()
        );
      }
    } else if (post.user.id !== userId) {
      // Notify post author
      await this.notificationsService.create(
        post.user.id,
        '新评论',
        `${user.name || '有人'} 评论了你的动态: ${content}`,
        NotificationType.COMMUNITY_COMMENT,
        postId.toString()
      );
    }
    
    return this.postRepository.save(post);
  }

  async delete(userId: string, postId: number) {
    const post = await this.postRepository.findOne({ where: { id: postId }, relations: ['user'] });
    if (!post) throw new NotFoundException('帖子不存在');
    
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (post.user.id !== userId && !isAdmin) {
      throw new ForbiddenException('无权删除');
    }

    return this.postRepository.remove(post);
  }

  async createMockData() {
    const count = await this.postRepository.count();
    if (count === 0) {
      // 需要先确保有用户，这里简化处理，假设已有用户ID 1
      // 实际应用中应更严谨
    }
  }
}
