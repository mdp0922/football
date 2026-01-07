import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../user/entities/user.entity';
import { Match } from '../matches/entities/match.entity';
import { MatchRegistration } from '../matches/entities/match-registration.entity';
import { Team } from '../teams/entities/team.entity';
import { Announcement } from './entities/announcement.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Match, MatchRegistration, Team, Announcement]),
    NotificationsModule
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService], // Export for HomeService to use
})
export class AdminModule {}
