import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MatchesModule } from './matches/matches.module';
import { CommunityModule } from './community/community.module';
import { TeamsModule } from './teams/teams.module';
import { AdminModule } from './admin/admin.module';
import { User } from './user/entities/user.entity';
import { Match } from './matches/entities/match.entity';
import { Registration } from './matches/entities/registration.entity';
import { MatchRegistration } from './matches/entities/match-registration.entity';
import { Post } from './community/entities/post.entity';
import { Team } from './teams/entities/team.entity';
import { TeamRequest } from './teams/entities/team-request.entity';
import { Notification } from './notifications/entities/notification.entity';
import { Venue } from './venues/entities/venue.entity';
import { Announcement } from './admin/entities/announcement.entity';
import { NotificationsModule } from './notifications/notifications.module';
import { VenuesModule } from './venues/venues.module';
import { AdsModule } from './ads/ads.module';
import { UploadModule } from './upload/upload.module';
import { ScheduleModule } from '@nestjs/schedule';
import { Ad } from './ads/entities/ad.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'), // 对应容器内的 /app/uploads
      serveRoot: '/uploads',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'dist'), // 对应容器内的 /app/dist (前端构建产物)
      // exclude: ['/api/(.*)'], // 暂时注释掉 exclude，依赖 Global Prefix 处理
      serveStaticOptions: {
        fallthrough: true,
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = {
          type: 'postgres' as const,
          host: configService.get('POSTGRES_HOST') || 'db',
          port: parseInt(configService.get('POSTGRES_PORT'), 10) || 5432,
          username: configService.get('POSTGRES_USER') || 'postgres',
          password: configService.get('POSTGRES_PASSWORD') || 'mysecretpassword',
          database: configService.get('POSTGRES_DB') || 'football_db',
          entities: [User, Match, Registration, MatchRegistration, Post, Team, TeamRequest, Notification, Venue, Announcement, Ad],
          synchronize: true,
          ssl: false,
          connectTimeoutMS: 20000, 
          extra: {
            connectionLimit: 10,
          },
        };
        console.log('TypeORM Config:', JSON.stringify(config, null, 2));
        return config;
      },
    }),
    AuthModule,
    UserModule,
    MatchesModule,
    CommunityModule,
    TeamsModule,
    AdminModule,
    UploadModule,
    NotificationsModule,
    VenuesModule,
    AdsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
