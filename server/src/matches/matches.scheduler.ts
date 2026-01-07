import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from './entities/match.entity';
import { MatchRegistration } from './entities/match-registration.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import dayjs from 'dayjs';

@Injectable()
export class MatchesScheduler {
  private readonly logger = new Logger(MatchesScheduler.name);

  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(MatchRegistration)
    private matchRegistrationRepository: Repository<MatchRegistration>,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleMatchReminders() {
    this.logger.debug('Checking for upcoming matches...');
    
    const now = dayjs();
    const targetStart = now.add(23, 'hour').format('YYYY-MM-DD HH:mm');
    const targetEnd = now.add(25, 'hour').format('YYYY-MM-DD HH:mm');

    const matches = await this.matchRepository.createQueryBuilder('match')
        .where('match.reminderSent = :sent', { sent: false })
        .andWhere('match.startTime >= :start', { start: targetStart })
        .andWhere('match.startTime <= :end', { end: targetEnd })
        .getMany();

    for (const match of matches) {
        // Find registrations for this match
        const registrations = await this.matchRegistrationRepository.find({
            where: { match: { id: match.id }, status: 'approved' },
            relations: ['team']
        });

        if (registrations.length === 0) continue;

        const participantIds = new Set<string>();
        
        for (const reg of registrations) {
            // Priority: playerIds (roster) -> team members
            if (reg.playerIds && reg.playerIds.length > 0) {
                reg.playerIds.forEach(id => participantIds.add(id));
            } else if (reg.team && reg.team.members) {
                 reg.team.members.forEach(id => participantIds.add(id));
            }
        }

        if (participantIds.size > 0) {
            for (const userId of participantIds) {
                await this.notificationsService.create(
                    userId,
                    '比赛提醒',
                    `您参与的赛事 "${match.title}" 将于24小时后开始，请准时参加。`,
                    NotificationType.MATCH_REMINDER,
                    match.id.toString()
                );
            }
            this.logger.log(`Sent reminders to ${participantIds.size} users for match ${match.id}`);
        }

        match.reminderSent = true;
        await this.matchRepository.save(match);
    }
  }
}
