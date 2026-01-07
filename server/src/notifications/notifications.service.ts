import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async create(userId: string, title: string, content: string, type: NotificationType, relatedId?: string) {
    const notification = this.notificationRepository.create({
      user: { id: userId } as User,
      title,
      content,
      type,
      relatedId,
    });
    return this.notificationRepository.save(notification);
  }

  async findAll(userId: string) {
    return this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string) {
    await this.notificationRepository.update(id, { isRead: true });
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update({ user: { id: userId } }, { isRead: true });
    return { success: true };
  }
  
  async getUnreadCount(userId: string) {
    return this.notificationRepository.count({
      where: { user: { id: userId }, isRead: false }
    });
  }
}
