import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { Match } from './entities/match.entity';
import { Registration } from './entities/registration.entity';
import { MatchRegistration } from './entities/match-registration.entity';
import { User } from '../user/entities/user.entity';
import { Team } from '../teams/entities/team.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommunityModule } from '../community/community.module';
import { MatchesScheduler } from './matches.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, Registration, MatchRegistration, User, Team]),
    NotificationsModule,
    CommunityModule
  ],
  controllers: [MatchesController],
  providers: [MatchesService, MatchesScheduler],
})
export class MatchesModule {}
