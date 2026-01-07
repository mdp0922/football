import { Injectable, NotFoundException, BadRequestException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Match, MatchType } from './entities/match.entity';
import { Registration } from './entities/registration.entity';
import { MatchRegistration } from './entities/match-registration.entity';
import { User } from '../user/entities/user.entity';
import { Team } from '../teams/entities/team.entity';
import { CommunityService } from '../community/community.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class MatchesService implements OnModuleInit {
  constructor(
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
    @InjectRepository(Registration)
    private registrationRepository: Repository<Registration>,
    @InjectRepository(MatchRegistration)
    private matchRegistrationRepository: Repository<MatchRegistration>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    private communityService: CommunityService,
    private notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
  }

  async findAll(): Promise<Match[]> {
    const matches = await this.matchesRepository.find({ order: { createdAt: 'DESC' } });
    return this.updateMatchesStatus(matches);
  }

  async findOne(id: number) {
    const match = await this.matchesRepository.findOne({ 
      where: { id },
      relations: ['registrations', 'registrations.user'] 
    });
    if (!match) throw new NotFoundException('赛事不存在');

    // Load Team Registrations
    const teamRegs = await this.matchRegistrationRepository.find({
      where: { match: { id } },
      relations: ['team', 'team.captain']
    });
    (match as any).teamRegistrations = teamRegs;
    
    // Add additional info like team names if applicable
    if (match.homeTeamId) {
      const homeTeam = await this.teamRepository.findOne({ where: { id: match.homeTeamId } });
      if (homeTeam && homeTeam.members && homeTeam.members.length > 0) {
          const memberList = await this.userRepository.find({ 
              where: { id: In(homeTeam.members) },
              select: ['id', 'name', 'avatar', 'sportsProfile', 'jerseyNumber']
          });
          (homeTeam as any).memberList = memberList;
      }
      (match as any).homeTeam = homeTeam;
    }
    if (match.awayTeamId) {
      const awayTeam = await this.teamRepository.findOne({ where: { id: match.awayTeamId } });
      if (awayTeam && awayTeam.members && awayTeam.members.length > 0) {
          const memberList = await this.userRepository.find({ 
              where: { id: In(awayTeam.members) },
              select: ['id', 'name', 'avatar', 'sportsProfile', 'jerseyNumber']
          });
          (awayTeam as any).memberList = memberList;
      }
      (match as any).awayTeam = awayTeam;
    }

    return this.updateMatchStatus(match);
  }

  private async updateMatchesStatus(matches: Match[]): Promise<Match[]> {
    const now = new Date();
    const updatedMatches = [];
    
    for (const match of matches) {
      const updated = await this.checkAndUpdateStatus(match, now);
      updatedMatches.push(updated);
    }
    return updatedMatches;
  }

  private async updateMatchStatus(match: Match): Promise<Match> {
    return this.checkAndUpdateStatus(match, new Date());
  }

  private async checkAndUpdateStatus(match: Match, now: Date): Promise<Match> {
    if (!match.startTime || !match.endTime) return match;

    const startTime = new Date(match.startTime);
    const endTime = new Date(match.endTime);
    let newStatus = match.status;

    if (now > endTime) {
      newStatus = 'finished';
    } else if (now >= startTime && now <= endTime) {
      newStatus = 'ongoing';
    } else if (now < startTime) {
      // Check registration window
      if (match.registrationStartTime && match.registrationEndTime) {
          const regStart = new Date(match.registrationStartTime);
          const regEnd = new Date(match.registrationEndTime);
          if (now >= regStart && now <= regEnd) {
              newStatus = 'registering';
          } else if (now > regEnd) {
              newStatus = 'pending'; // Registration closed, waiting for start
          } else {
              newStatus = 'upcoming'; // Not yet open for registration
          }
      } else {
          newStatus = 'registering'; // Default fallback
      }
    }

    // Special logic for TEAM_FRIENDLY
    if (match.type === MatchType.TEAM_FRIENDLY) {
       // If ongoing time but no opponent, maybe stay registering or finished?
       // For now let's respect time, but maybe frontend can show "Waiting for opponent" even if time started?
       // Let's keep simple: Time rules all. 
       // But if time passed start and no opponent, it's basically invalid/finished.
       if (newStatus === 'ongoing' && !match.awayTeamId) {
          // If time started but no opponent, let's call it registering still? Or maybe expire it?
          // If we say ongoing, people might think it's happening.
          // Let's keep it 'registering' if no opponent, so people can still respond?
          // But if time passed end time, it's finished.
          newStatus = 'registering';
       }
    }

    if (newStatus !== match.status) {
      match.status = newStatus;
      await this.matchesRepository.save(match);
    }
    return match;
  }

  async update(id: number, userId: string, updateData: any) {
    const match = await this.matchesRepository.findOne({ where: { id } });
    if (!match) throw new NotFoundException('赛事不存在');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const isInitiator = match.initiatorId === userId;

    if (isAdmin || isInitiator) {
      // Allowed
    } else {
      throw new ForbiddenException('无权修改');
    }

    const oldReportContent = match.reportContent;
    const oldEvents = match.events;

    Object.assign(match, updateData);
    const savedMatch = await this.matchesRepository.save(match);

    // If report is published/updated
    if (updateData.reportContent && updateData.reportContent !== oldReportContent) {
       // 1. Sync to Community
       try {
         await this.communityService.create(
           userId, 
           `【战报】${match.title}\n比分: ${match.score || '未录入'}\n\n${match.reportContent}`, 
           match.reportImages || []
         );
       } catch (e) {
         console.error('Failed to sync report to community', e);
       }

       // 2. Notify Participants
       try {
         // Get all participants
         const registrations = await this.registrationRepository.find({ where: { match: { id } }, relations: ['user'] });
         const playerIds = registrations.map(r => r.user.id);
         
         if (match.type === MatchType.LEAGUE || match.type === MatchType.TEAM_FRIENDLY) {
            const teamRegs = await this.matchRegistrationRepository.find({ where: { match: { id } } });
            for (const tr of teamRegs) {
              if (tr.playerIds) {
                 playerIds.push(...tr.playerIds);
              }
            }
         }

         const uniqueIds = [...new Set(playerIds)];
         
         for (const pid of uniqueIds) {
           if (pid === userId) continue; 
           await this.notificationsService.create(
             pid,
             '赛事战报',
             `您参与的赛事 "${match.title}" 已发布战报，快去看看吧！`,
             NotificationType.SYSTEM, 
             id.toString()
           );
         }
       } catch (e) {
         console.error('Failed to notify participants', e);
       }
    }

    // 3. Update User Stats if events changed
    if (updateData.events) {
       // Revert old events stats?
       // For simplicity, we can't easily revert without knowing state before. 
       // Ideally we should recalculate all stats from all matches. 
       // Or, we assume 'events' is the full list of events for this match.
       // We can: 
       // 1. Decrement stats for players in oldEvents
       // 2. Increment stats for players in new events
       
       if (oldEvents) {
          for (const event of oldEvents) {
              if (event.playerId) {
                  await this.updateUserStats(event.playerId, -1, 0); // Remove goal
              }
              if (event.assistPlayerId) {
                  await this.updateUserStats(event.assistPlayerId, 0, -1); // Remove assist
              }
          }
       }
       
       if (match.events) {
          for (const event of match.events) {
              if (event.playerId) {
                  await this.updateUserStats(event.playerId, 1, 0); // Add goal
              }
              if (event.assistPlayerId) {
                  await this.updateUserStats(event.assistPlayerId, 0, 1); // Add assist
              }
          }
       }
    }

    return savedMatch;
  }

  private async updateUserStats(userId: string, goalsDelta: number, assistsDelta: number) {
      if (!userId) return;
      try {
          const user = await this.userRepository.findOne({ where: { id: userId } });
          if (!user) return;
          
          user.stats = {
              ...user.stats,
              goals: (user.stats.goals || 0) + goalsDelta,
              assists: (user.stats.assists || 0) + assistsDelta
          };
          if (user.stats.goals < 0) user.stats.goals = 0;
          if (user.stats.assists < 0) user.stats.assists = 0;
          
          await this.userRepository.save(user);
      } catch (e) {
          console.error(`Failed to update stats for user ${userId}`, e);
      }
  }

  async remove(id: number, userId: string) {
    const match = await this.matchesRepository.findOne({ where: { id } });
    if (!match) throw new NotFoundException('赛事不存在');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const isInitiator = match.initiatorId === userId;

    if (isAdmin || isInitiator) {
      // Allowed
    } else {
      throw new ForbiddenException('无权删除');
    }

    // Cascade delete registrations
    try {
        const regs = await this.registrationRepository.find({ where: { match: { id } } });
        if (regs.length > 0) {
            await this.registrationRepository.remove(regs);
        }

        const matchRegs = await this.matchRegistrationRepository.find({ where: { match: { id } } });
        if (matchRegs.length > 0) {
            await this.matchRegistrationRepository.remove(matchRegs);
        }
    } catch (e) {
        console.error('Failed to delete registrations', e);
        throw e;
    }

    return this.matchesRepository.remove(match);
  }

  async create(userId: string, data: any) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    // LEAGUE: Admin only
    if (data.type === MatchType.LEAGUE) {
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        throw new ForbiddenException('只有管理员可以创建联赛');
      }
    }

    // TEAM_FRIENDLY: Team Admin only
    if (data.type === MatchType.TEAM_FRIENDLY) {
      if (!user.teamId) throw new BadRequestException('您没有加入球队');
      const team = await this.teamRepository.findOne({ where: { id: user.teamId }, relations: ['captain'] });
      const isTeamAdmin = team.captain.id === userId || team.admins?.includes(userId);
      if (!isTeamAdmin) throw new ForbiddenException('只有球队管理员可以发起友谊赛');
      
      data.homeTeamId = team.id;
    }

    // Prepare data
    const maxTeams = data.maxTeams ? parseInt(data.maxTeams) : (data.type === MatchType.LEAGUE ? 16 : 2);
    const regStart = data.registrationStartTime ? new Date(data.registrationStartTime) : null;
    const regEnd = data.registrationEndTime ? new Date(data.registrationEndTime) : null;
    const start = data.startTime ? new Date(data.startTime) : null;
    const end = data.endTime ? new Date(data.endTime) : null;
    
    const match = this.matchesRepository.create({
      ...data,
      initiatorId: userId,
      status: 'registering',
      currentPlayers: 0,
      maxTeams: maxTeams,
      teams: data.type === MatchType.LEAGUE ? `0/${maxTeams}` : (data.type === MatchType.TEAM_FRIENDLY ? '1/2' : '0/2'),
      registrationStartTime: regStart,
      registrationEndTime: regEnd,
      startTime: start,
      endTime: end
    } as any);
    
    const savedMatch = await this.matchesRepository.save(match);
    const matchEntity = Array.isArray(savedMatch) ? savedMatch[0] : savedMatch;

    // Auto join for initiator
    try {
      if (data.type === MatchType.PICKUP || data.type === MatchType.NIGHT) {
         // Auto register initiator
         const reg = this.registrationRepository.create({
            user,
            match: matchEntity,
            status: 'approved',
            side: data.side || 'NONE'
         });
         await this.registrationRepository.save(reg);
         
         matchEntity.currentPlayers += 1;
         await this.matchesRepository.save(matchEntity);

         user.stats.matches = (user.stats.matches || 0) + 1;
         await this.userRepository.save(user);

      } else if (data.type === MatchType.TEAM_FRIENDLY) {
         // Auto register ALL team members
         const team = await this.teamRepository.findOne({ where: { id: data.homeTeamId } });
         if (team && team.members && team.members.length > 0) {
            const members = await this.userRepository.find({ where: { id: In(team.members) } });
            
            for (const member of members) {
                 const reg = this.registrationRepository.create({
                    user: member,
                    match: matchEntity,
                    status: 'approved',
                    side: 'HOME'
                 });
                 await this.registrationRepository.save(reg);
                 
                 member.stats.matches = (member.stats.matches || 0) + 1;
                 await this.userRepository.save(member);
            }

            matchEntity.currentPlayers = (matchEntity.currentPlayers || 0) + members.length;
            await this.matchesRepository.save(matchEntity);
         } else {
             // Fallback if no members found (should at least have creator?)
             // Just add creator if not in members list for some reason
             // But creator should be in members. 
         }
      }
    } catch (e) {
      console.error('Auto join failed', e);
    }

    // RELOAD the match with relations to ensure frontend gets full data immediately if they use the return value
    // But usually frontend calls findOne separately. 
    // Just return savedMatch is fine.
    return savedMatch;
  }

  async leagueRegister(userId: string, matchId: number, playerIds: string[]) {
    const match = await this.matchesRepository.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('赛事不存在');
    if (match.status !== 'registering') throw new BadRequestException('该赛事当前不可报名');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (!user.teamId) throw new BadRequestException('您没有加入球队');

    const team = await this.teamRepository.findOne({ where: { id: user.teamId }, relations: ['captain'] });
    const isTeamAdmin = team.captain.id === userId || team.admins?.includes(userId);
    if (!isTeamAdmin) throw new ForbiddenException('只有球队管理员可以报名联赛');

    // Check existing registration
    let reg = await this.matchRegistrationRepository.findOne({ 
      where: { match: { id: matchId }, team: { id: team.id } } 
    });

    if (reg) {
      // Update existing registration
      reg.playerIds = playerIds;
      reg.status = 'confirmed';
    } else {
      // Create new registration
      reg = this.matchRegistrationRepository.create({
        match,
        team,
        playerIds,
        status: 'confirmed'
      });
    }

    await this.matchRegistrationRepository.save(reg);
    
    // Update match teams count
    const count = await this.matchRegistrationRepository.count({ 
        where: { 
            match: { id: matchId },
            status: In(['pending', 'confirmed', 'approved']) 
        } 
    });
    match.teams = `${count}/${match.maxTeams || 16}`;
    await this.matchesRepository.save(match);

    return reg;
  }

  async autoLeagueRegister(userId: string, matchId: number) {
    const match = await this.matchesRepository.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('赛事不存在');
    if (match.status !== 'registering') throw new BadRequestException('该赛事当前不可报名或已截止');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    if (!user.teamId) throw new BadRequestException('您没有加入球队');

    const team = await this.teamRepository.findOne({ where: { id: user.teamId }, relations: ['captain'] });
    const isTeamAdmin = team.captain.id === userId || team.admins?.includes(userId);
    if (!isTeamAdmin) throw new ForbiddenException('只有球队管理员可以报名');

    // Get all team members
    if (!team.members || team.members.length === 0) throw new BadRequestException('球队暂无成员');
    
    // Check existing registration
    let reg = await this.matchRegistrationRepository.findOne({ 
      where: { match: { id: matchId }, team: { id: team.id } } 
    });

    if (reg) {
       reg.playerIds = team.members;
       reg.status = 'confirmed';
    } else {
       reg = this.matchRegistrationRepository.create({
        match,
        team,
        playerIds: team.members,
        status: 'confirmed'
      });
    }

    await this.matchRegistrationRepository.save(reg);

    // Update match teams count
    const count = await this.matchRegistrationRepository.count({ 
        where: { 
            match: { id: matchId },
            status: In(['pending', 'confirmed', 'approved']) 
        } 
    });
    match.teams = `${count}/${match.maxTeams || 16}`;
    await this.matchesRepository.save(match);

    return { message: '报名信息已同步，共提交 ' + team.members.length + ' 人' };
  }

  async register(userId: string, matchId: number, data: any = {}) {
    const match = await this.matchesRepository.findOne({ 
        where: { id: matchId },
        relations: ['registrations']
    });
    if (!match) throw new NotFoundException('赛事不存在');
    if (match.status !== 'registering') throw new BadRequestException('该赛事当前不可报名');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    // 1. LEAGUE Registration (Legacy Logic - if we keep it, but new method is leagueRegister)
    // We should probably deprecate this block if we move to MatchRegistration entity
    if (match.type === MatchType.LEAGUE) {
        throw new BadRequestException('请使用球队报名通道');
    }

    // 2. TEAM_FRIENDLY Response
    if (match.type === MatchType.TEAM_FRIENDLY) {
       if (!user.teamId) throw new BadRequestException('您没有加入球队');
       if (user.teamId === match.homeTeamId) throw new BadRequestException('不能挑战自己的球队');
       
       const team = await this.teamRepository.findOne({ where: { id: user.teamId }, relations: ['captain'] });
       const isTeamAdmin = team.captain.id === userId || team.admins?.includes(userId);
       if (!isTeamAdmin) throw new ForbiddenException('只有球队管理员可以应战');
       
       if (match.awayTeamId) throw new BadRequestException('该比赛已有人应战');
       
       match.awayTeamId = team.id;
       match.status = 'ongoing';
       match.teams = '2/2';
       await this.matchesRepository.save(match);
       
       // Auto add captain as AWAY player
       try {
           const reg = this.registrationRepository.create({
               user,
               match,
               status: 'approved',
               side: 'AWAY'
           });
           await this.registrationRepository.save(reg);
           match.currentPlayers += 1;
           await this.matchesRepository.save(match);
       } catch (e) {
           console.error('Failed to auto-add captain for away team', e);
       }
       
       return { message: '应战成功' };
    }

    // 3. PICKUP / NIGHT (Individual)
    const existing = await this.registrationRepository.findOne({
      where: { user: { id: userId }, match: { id: matchId } },
    });
    if (existing) throw new BadRequestException('您已报名');

    // Auto-balance logic for Pickup Matches
    let assignedSide = data.side || 'NONE';
    if (assignedSide === 'NONE' && (match.type === MatchType.PICKUP || match.type === MatchType.NIGHT)) {
        const homeCount = match.registrations.filter(r => r.side === 'HOME').length;
        const awayCount = match.registrations.filter(r => r.side === 'AWAY').length;
        assignedSide = homeCount <= awayCount ? 'HOME' : 'AWAY';
    }

    const reg = this.registrationRepository.create({
      user,
      match,
      status: 'approved',
      side: assignedSide
    });
    
    await this.registrationRepository.save(reg);
    
    // IMPORTANT: Push to registrations array if it exists, otherwise saving match might overwrite/remove the new registration relation
    if (match.registrations) {
        match.registrations.push(reg);
    }
    
    match.currentPlayers += 1;
    await this.matchesRepository.save(match);
    
    user.stats.matches = (user.stats.matches || 0) + 1;
    await this.userRepository.save(user);

    return { message: '报名成功' };
  }

  async cancelRegistration(userId: string, matchId: number) {
    const match = await this.matchesRepository.findOne({ 
        where: { id: matchId },
        relations: ['registrations']
    });
    if (!match) throw new NotFoundException('赛事不存在');

    if (match.status === 'finished') throw new BadRequestException('赛事已结束，无法取消');

    const user = await this.userRepository.findOne({ where: { id: userId } });

    // LEAGUE Special Logic: Cancel Team Registration
    if (match.type === MatchType.LEAGUE) {
        if (!user.teamId) throw new BadRequestException('您未加入球队');
        
        const team = await this.teamRepository.findOne({ where: { id: user.teamId }, relations: ['captain'] });
        const isTeamAdmin = team.captain.id === userId || team.admins?.includes(userId);
        
        if (!isTeamAdmin) throw new ForbiddenException('只有球队管理员可以取消报名');

        const leagueReg = await this.matchRegistrationRepository.findOne({
            where: { match: { id: matchId }, team: { id: user.teamId } }
        });

        if (!leagueReg) throw new BadRequestException('您的球队未报名');

        await this.matchRegistrationRepository.remove(leagueReg);

        // Update count
        const count = await this.matchRegistrationRepository.count({ where: { match: { id: matchId } } });
        match.teams = `${count}/${match.maxTeams || 16}`;
        await this.matchesRepository.save(match);

        return { message: '已取消报名' };
    }

    // TEAM_FRIENDLY Special Logic: Cancel Challenge (Withdraw Team)
    if (match.type === MatchType.TEAM_FRIENDLY) {
        // Check if user belongs to the AWAY team (Challenger)
        if (user.teamId && match.awayTeamId === user.teamId) {
             const team = await this.teamRepository.findOne({ where: { id: user.teamId }, relations: ['captain'] });
             const isTeamAdmin = team.captain.id === userId || team.admins?.includes(userId);
             
             // If Team Admin cancels, it means withdrawing the whole team
             if (isTeamAdmin) {
                 const awayRegs = await this.registrationRepository.find({ where: { match: { id: matchId }, side: 'AWAY' } });
                 if (awayRegs.length > 0) {
                     await this.registrationRepository.remove(awayRegs);
                 }
                 
                 match.awayTeamId = null;
                 if (match.status === 'ongoing') {
                     match.status = 'registering';
                 }
                 match.teams = '1/2';
                 match.currentPlayers = Math.max(0, (match.currentPlayers || 0) - awayRegs.length);
                 
                 // Clean up loaded registrations to reflect change if needed (though we save match)
                 if (match.registrations) {
                    match.registrations = match.registrations.filter(r => r.side !== 'AWAY');
                 }

                 await this.matchesRepository.save(match);
                 return { message: '已取消应战' };
             }
        }
    }

    const registration = await this.registrationRepository.findOne({
        where: { user: { id: userId }, match: { id: matchId } },
        relations: ['user']
    });

    if (!registration) throw new BadRequestException('您未报名该赛事');

    await this.registrationRepository.remove(registration);

    match.currentPlayers = Math.max(0, (match.currentPlayers || 1) - 1);
    // Remove from loaded relations to ensure save is clean
    if (match.registrations) {
        match.registrations = match.registrations.filter(r => r.id !== registration.id);
    }
    
    await this.matchesRepository.save(match);

    if (user) {
        user.stats.matches = Math.max(0, (user.stats.matches || 1) - 1);
        await this.userRepository.save(user);
    }

    return { message: '已取消报名' };
  }

  async getMyLeagueRegistration(userId: string, matchId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.teamId) return null;

    const reg = await this.matchRegistrationRepository.findOne({
      where: { match: { id: matchId }, team: { id: user.teamId } }
    });
    
    return reg || null;
  }

  async getAllRegistrations(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user.role !== 'admin' && user.role !== 'super_admin') throw new ForbiddenException('无权访问');

    return this.matchRegistrationRepository.find({
      relations: ['match', 'team', 'team.captain'],
      order: { createdAt: 'DESC' }
    });
  }

  async auditRegistration(userId: string, regId: number, status: string, feedback?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user.role !== 'admin' && user.role !== 'super_admin') throw new ForbiddenException('无权操作');

    const reg = await this.matchRegistrationRepository.findOne({ where: { id: regId }, relations: ['match'] });
    if (!reg) throw new NotFoundException('报名信息不存在');

    reg.status = status;
    if (feedback) reg.feedback = feedback;
    
    await this.matchRegistrationRepository.save(reg);

    // Update match teams count
    if (reg.match) {
        const count = await this.matchRegistrationRepository.count({ 
            where: { 
                match: { id: reg.match.id },
                status: In(['pending', 'confirmed', 'approved']) 
            } 
        });
        
        const match = await this.matchesRepository.findOne({ where: { id: reg.match.id } });
        if (match) {
             match.teams = `${count}/${match.maxTeams || 16}`;
             await this.matchesRepository.save(match);
        }
    }
    
    return reg;
  }

  async exportRegistrations(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user.role !== 'admin' && user.role !== 'super_admin') throw new ForbiddenException('无权操作');

    const regs = await this.matchRegistrationRepository.find({
      relations: ['match', 'team'],
    });

    // Simple JSON export for now. In real app, generate CSV/Excel
    // We also need to fetch player details for each registration
    const exportData = [];
    for (const reg of regs) {
      const players = await this.userRepository.find({
         where: { id: In(reg.playerIds) },
         select: ['name', 'idCard', 'jerseyNumber', 'phone']
      });
      
      exportData.push({
        match: reg.match.title,
        team: reg.team.name,
        status: reg.status,
        players: players.map(p => ({
          name: p.name,
          idCard: p.idCard,
          jerseyNumber: p.jerseyNumber,
          phone: p.phone
        }))
      });
    }
    
    return exportData;
  }

  async distributeTeams(matchId: number, userId: string) {
    const match = await this.matchesRepository.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('赛事不存在');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const isInitiator = match.initiatorId === userId;

    if (isAdmin || isInitiator) {
      // Allowed
    } else {
      throw new ForbiddenException('无权操作');
    }

    // Get all registrations to redistribute
    const regs = await this.registrationRepository.find({ 
      where: { match: { id: matchId } },
      relations: ['user']
    });

    if (regs.length === 0) {
      return { message: '没有待分配的球员' };
    }

    // Reset all to NONE first for full re-balance
    for (const r of regs) {
        r.side = 'NONE';
    }

    // Classify players by position
    const players = regs.map(r => ({
      reg: r,
      position: r.user.sportsProfile?.position?.[0] || 'UNKNOWN'
    }));

    const GKs = players.filter(p => p.position === '门将');
    const DFs = players.filter(p => p.position === '后卫');
    const MFs = players.filter(p => p.position === '中场');
    const FWs = players.filter(p => p.position === '前锋');
    const Others = players.filter(p => !['门将', '后卫', '中场', '前锋'].includes(p.position));

    // Reset counts
    let homeCount = 0;
    let awayCount = 0;

    const assign = async (p: any, side: 'HOME' | 'AWAY') => {
      p.reg.side = side;
      await this.registrationRepository.save(p.reg);
      if (side === 'HOME') homeCount++;
      else awayCount++;
    };

    // Helper to balance assignment
    const distribute = async (list: any[]) => {
      for (const p of list) {
        if (homeCount <= awayCount) {
          await assign(p, 'HOME');
        } else {
          await assign(p, 'AWAY');
        }
      }
    };

    // Priority distribution
    // 1. GK (1 per team ideally)
    await distribute(GKs);
    // 2. DF (4 per team ideally)
    await distribute(DFs);
    // 3. MF (3 per team ideally)
    await distribute(MFs);
    // 4. FW (3 per team ideally)
    await distribute(FWs);
    // 5. Others
    await distribute(Others);

    return { message: '分队完成' };
  }

  async addPlayerToMatch(matchId: number, userId: string, targetPlayerId: string, side: 'HOME' | 'AWAY') {
    const match = await this.matchesRepository.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('赛事不存在');

    // Check permission: Must be team admin of the corresponding side
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user.teamId) throw new ForbiddenException('您没有加入球队');

    let teamIdToCheck = null;
    if (side === 'HOME') teamIdToCheck = match.homeTeamId;
    else if (side === 'AWAY') teamIdToCheck = match.awayTeamId;

    if (!teamIdToCheck) throw new BadRequestException('该位置暂无球队');
    if (user.teamId !== teamIdToCheck) throw new ForbiddenException('您不是该球队成员');

    const team = await this.teamRepository.findOne({ where: { id: user.teamId }, relations: ['captain'] });
    const isTeamAdmin = team.captain.id === userId || team.admins?.includes(userId);
    if (!isTeamAdmin) throw new ForbiddenException('只有球队管理员可以添加球员');

    // Add player
    const targetPlayer = await this.userRepository.findOne({ where: { id: targetPlayerId } });
    if (!targetPlayer) throw new NotFoundException('球员不存在');

    // Check if already registered
    const existing = await this.registrationRepository.findOne({
      where: { user: { id: targetPlayerId }, match: { id: matchId } }
    });

    if (existing) {
      if (existing.side === side) return { message: '球员已在队中' };
      // Move player? Or error? Let's error for safety
      throw new BadRequestException('球员已报名其他队伍');
    }

    const reg = this.registrationRepository.create({
      user: targetPlayer,
      match,
      status: 'approved',
      side
    });

    await this.registrationRepository.save(reg);
    
    match.currentPlayers += 1;
    await this.matchesRepository.save(match);
    
    targetPlayer.stats.matches = (targetPlayer.stats.matches || 0) + 1;
    await this.userRepository.save(targetPlayer);

    return { message: '添加成功' };
  }

  async syncTeamPlayers(matchId: number, userId: string, side: 'HOME' | 'AWAY') {
    const match = await this.matchesRepository.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('赛事不存在');

    // Permission check
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user.teamId) throw new ForbiddenException('您没有加入球队');

    let teamIdToCheck = null;
    if (side === 'HOME') teamIdToCheck = match.homeTeamId;
    else if (side === 'AWAY') teamIdToCheck = match.awayTeamId;

    if (!teamIdToCheck) throw new BadRequestException('该位置暂无球队');
    if (user.teamId !== teamIdToCheck) throw new ForbiddenException('您不是该球队成员');

    const team = await this.teamRepository.findOne({ where: { id: user.teamId }, relations: ['captain'] });
    const isTeamAdmin = team.captain.id === userId || team.admins?.includes(userId);
    if (!isTeamAdmin) throw new ForbiddenException('只有球队管理员可以同步球员');

    // Get all team members
    if (!team.members || team.members.length === 0) return { message: '球队暂无成员' };

    const members = await this.userRepository.find({ where: { id: In(team.members) } });
    let addedCount = 0;

    for (const member of members) {
        // Check if already registered
        const existing = await this.registrationRepository.findOne({
            where: { user: { id: member.id }, match: { id: matchId } }
        });

        if (!existing) {
             const reg = this.registrationRepository.create({
                user: member,
                match,
                status: 'approved',
                side
             });
             await this.registrationRepository.save(reg);
             
             member.stats.matches = (member.stats.matches || 0) + 1;
             await this.userRepository.save(member);
             addedCount++;
        }
    }

    if (addedCount > 0) {
        match.currentPlayers = (match.currentPlayers || 0) + addedCount;
        await this.matchesRepository.save(match);
    }

    return { message: `同步完成，新增 ${addedCount} 名球员` };
  }
}