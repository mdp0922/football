import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Team } from './entities/team.entity';
import { User } from '../user/entities/user.entity';
import { TeamRequest, TeamRequestType, TeamRequestStatus } from './entities/team-request.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);
  constructor(
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TeamRequest)
    private requestRepository: Repository<TeamRequest>,
    private notificationsService: NotificationsService,
  ) {}

  async findAll() {
    return this.teamRepository.find({ relations: ['captain'] });
  }

  private formatPosition(position: any): string | null {
    if (!position) return null;
    return Array.isArray(position) ? position.join('/') : String(position);
  }

  async findOne(id: string) {
    let team;
    try {
      // Use loadRelationIds to avoid loading full User entity immediately
      // This prevents potential circular reference issues and gives us cleaner control
      team = await this.teamRepository.findOne({ 
        where: { id }, 
        loadRelationIds: { relations: ['captain'] } 
      });
    } catch (e) {
      console.error('Find team error:', e);
      throw new BadRequestException('查询球队失败');
    }

    if (!team) {
      throw new NotFoundException('球队不存在');
    }
    
    // Cast to any because loadRelationIds changes captain type to string/number
    const rawTeam = team as any;

    const teamData: any = {
      id: rawTeam.id,
      name: rawTeam.name,
      logo: rawTeam.logo,
      slogan: rawTeam.slogan,
      description: rawTeam.description,
      // captain will be the ID here
      captain: rawTeam.captain ? { id: rawTeam.captain } : null,
      admins: rawTeam.admins || [],
      members: rawTeam.members || [],
      establishmentDate: rawTeam.establishmentDate,
      memberRoles: rawTeam.memberRoles || {},
      contactPhone: rawTeam.contactPhone,
      isCertified: rawTeam.isCertified,
      honors: rawTeam.honors || [],
      createdAt: rawTeam.createdAt,
      updatedAt: rawTeam.updatedAt,
    };

    // Enrich Captain Profile
    if (teamData.captain && teamData.captain.id) {
      try {
        // Since we used loadRelationIds, teamData.captain.id is the database PK (_id)
        // We need to find the user by _id and get their public id
        const captainWithProfile = await this.userRepository.findOne({
          where: { _id: teamData.captain.id } as any,
          select: ['id', 'name', 'avatar', 'sportsProfile']
        });
        
        if (captainWithProfile) {
          // Replace internal PK with public ID
          teamData.captain.id = captainWithProfile.id;
          teamData.captain.name = captainWithProfile.name;
          teamData.captain.avatar = captainWithProfile.avatar;
          
          const sp = captainWithProfile.sportsProfile || {};
          teamData.captain.footballAge = sp.age;
          teamData.captain.position = this.formatPosition(sp.position);
        }
      } catch (e) {
        console.warn('Failed to load captain profile', e);
      }
    }
    
    // Enrich Members
    let memberDetails = [];
    if (Array.isArray(teamData.members) && teamData.members.length > 0) {
      const validIds = teamData.members.filter((m: any) => m && typeof m === 'string' && m.trim().length > 0);
      
      if (validIds.length > 0) {
        try {
          memberDetails = await this.userRepository.find({
            where: { id: In(validIds) },
            select: ['id', 'name', 'avatar', 'sportsProfile', 'jerseyNumber']
          });
        } catch (e) {
           console.warn('Failed to load members', e);
        }
      }
    }
    
    teamData.memberDetails = memberDetails.map(m => {
       const sp = m.sportsProfile || {};
       return {
         id: m.id,
         name: m.name,
         avatar: m.avatar,
         jerseyNumber: m.jerseyNumber,
         footballAge: sp.age,
         position: this.formatPosition(sp.position)
       };
    });
    
    return teamData;
  }

  async create(userId: string, createTeamDto: any) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (user.teamId) {
      throw new BadRequestException('您已加入其他球队，无法创建');
    }

    const team = this.teamRepository.create({
      ...createTeamDto,
      captain: user,
      members: [userId], // 创建者默认为成员
      admins: [],
    });

    const savedTeam = await this.teamRepository.save(team);
    
    // Update user teamId
    user.teamId = (savedTeam as unknown as Team).id;
    await this.userRepository.save(user);

    // Return the full team details structure to avoid 500 error on serialization of raw entity
    return this.findOne((savedTeam as unknown as Team).id);
  }

  async joinRequest(userId: string, teamId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user.teamId) {
      throw new BadRequestException('您已加入其他球队');
    }

    const team = await this.teamRepository.findOne({ where: { id: teamId }, relations: ['captain'] });
    if (!team) throw new NotFoundException('球队不存在');

    // Check existing pending request
    const existing = await this.requestRepository.findOne({
      where: {
        user: { id: userId },
        team: { id: teamId },
        type: TeamRequestType.JOIN,
        status: TeamRequestStatus.PENDING
      }
    });
    if (existing) throw new BadRequestException('您已提交申请，请等待审核');

    const req = this.requestRepository.create({
      user,
      team,
      type: TeamRequestType.JOIN
    });
    const savedReq = await this.requestRepository.save(req);

    // Notify Captain
    await this.notificationsService.create(
      team.captain.id,
      '新的入队申请',
      `${user.name || '有人'} 申请加入您的球队 ${team.name}`,
      NotificationType.TEAM_REQUEST,
      team.id
    );

    // Notify Admins
    if (team.admins && team.admins.length > 0) {
      for (const adminId of team.admins) {
        await this.notificationsService.create(
          adminId,
          '新的入队申请',
          `${user.name || '有人'} 申请加入球队 ${team.name}`,
          NotificationType.TEAM_REQUEST,
          team.id
        );
      }
    }

    return savedReq;
  }

  async leaveRequest(userId: string, teamId: string) {
    const team = await this.teamRepository.findOne({ where: { id: teamId }, relations: ['captain'] });
    if (!team) throw new NotFoundException('球队不存在');

    if (team.captain.id === userId) {
      throw new BadRequestException('创始人无法退出球队，请先转让球队');
    }

    if (!team.members.includes(userId)) {
      throw new BadRequestException('您不是该球队成员');
    }

    const existing = await this.requestRepository.findOne({
      where: {
        user: { id: userId },
        team: { id: teamId },
        type: TeamRequestType.LEAVE,
        status: TeamRequestStatus.PENDING
      }
    });
    if (existing) throw new BadRequestException('您已提交退出申请');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const req = this.requestRepository.create({
      user,
      team,
      type: TeamRequestType.LEAVE
    });
    return this.requestRepository.save(req);
  }

  async getRequests(userId: string, teamId: string) {
    // Verify admin/captain permission
    const team = await this.teamRepository.findOne({ where: { id: teamId }, relations: ['captain'] });
    if (!team) throw new NotFoundException('球队不存在');
    
    const isAdmin = team.captain.id === userId || (team.admins && team.admins.includes(userId));
    if (!isAdmin) throw new ForbiddenException('无权查看申请');

    return this.requestRepository.find({
      where: { team: { id: teamId }, status: TeamRequestStatus.PENDING },
      relations: ['user'],
      order: { createdAt: 'DESC' }
    });
  }

  async auditRequest(operatorId: string, requestId: string, status: 'APPROVED' | 'REJECTED') {
    const req = await this.requestRepository.findOne({ 
      where: { id: requestId }, 
      relations: ['team', 'user', 'team.captain'] 
    });
    if (!req) throw new NotFoundException('申请不存在');
    if (req.status !== TeamRequestStatus.PENDING) throw new BadRequestException('申请已处理');

    const team = req.team;
    const isAdmin = team.captain.id === operatorId || (team.admins && team.admins.includes(operatorId));
    if (!isAdmin) throw new ForbiddenException('无权处理申请');

    req.status = status === 'APPROVED' ? TeamRequestStatus.APPROVED : TeamRequestStatus.REJECTED;
    await this.requestRepository.save(req);

    // Notify User
    const auditResult = status === 'APPROVED' ? '通过' : '拒绝';
    await this.notificationsService.create(
      req.user.id,
      '申请审核结果',
      `您关于 ${team.name} 的${req.type === 'JOIN' ? '加入' : '退出'}申请已被${auditResult}`,
      NotificationType.TEAM_AUDIT,
      team.id
    );

    if (status === 'APPROVED') {
      if (req.type === TeamRequestType.JOIN) {
        if (!team.members.includes(req.user.id)) {
          team.members.push(req.user.id);
          await this.teamRepository.save(team);
          req.user.teamId = team.id;
          await this.userRepository.save(req.user);
        }
      } else if (req.type === TeamRequestType.LEAVE) {
        team.members = team.members.filter(m => m !== req.user.id);
        if (team.admins && team.admins.includes(req.user.id)) {
          team.admins = team.admins.filter(a => a !== req.user.id);
        }
        await this.teamRepository.save(team);
        req.user.teamId = null;
        await this.userRepository.save(req.user);
      }
    }
    return req;
  }

  async disband(userId: string, teamId: string) {
    const team = await this.teamRepository.findOne({ where: { id: teamId }, relations: ['captain'] });
    if (!team) throw new NotFoundException('球队不存在');

    if (team.captain.id !== userId) throw new ForbiddenException('只有创始人可以解散球队');

    // 1. Clear teamId for all members
    if (team.members && team.members.length > 0) {
      await this.userRepository.createQueryBuilder()
        .update(User)
        .set({ teamId: null })
        .where("id IN (:...ids)", { ids: team.members })
        .execute();
    }

    // 2. Delete all related requests
    await this.requestRepository.delete({ team: { id: teamId } });

    // 3. Delete team
    return this.teamRepository.remove(team);
  }

  async getUserPendingRequests(userId: string) {
    return this.requestRepository.find({
      where: {
        user: { id: userId },
        status: TeamRequestStatus.PENDING
      },
      relations: ['team']
    });
  }

  async update(id: string, userId: string, updateTeamDto: any) {
    const team = await this.teamRepository.findOne({ where: { id }, relations: ['captain'] });
    if (!team) throw new NotFoundException('球队不存在');

    const isAdmin = team.captain.id === userId || (team.admins && team.admins.includes(userId));
    if (!isAdmin) throw new BadRequestException('只有管理员可以修改球队信息');

    // Handle member numbers batch update
    if (updateTeamDto.memberNumbers) {
      const numberUpdates = updateTeamDto.memberNumbers;
      const memberIds = Object.keys(numberUpdates);
      
      // We need to update User entities directly for jerseyNumber
      if (memberIds.length > 0) {
        for (const mId of memberIds) {
          if (team.members.includes(mId)) {
             await this.userRepository.update(mId, { jerseyNumber: numberUpdates[mId] });
          }
        }
      }
      delete updateTeamDto.memberNumbers; // Remove from team update payload
    }

    Object.assign(team, updateTeamDto);
    return this.teamRepository.save(team);
  }

  async addAdmin(userId: string, teamId: string, targetUserId: string) {
    const team = await this.teamRepository.findOne({ where: { id: teamId }, relations: ['captain'] });
    if (team.captain.id !== userId) throw new ForbiddenException('只有创始人可设置管理员');
    
    if (!team.members.includes(targetUserId)) throw new BadRequestException('该用户不是球队成员');
    if (team.admins && team.admins.length >= 5) throw new BadRequestException('管理员人数已达上限');
    
    if (!team.admins) team.admins = [];
    if (team.admins.includes(targetUserId)) return team;

    team.admins.push(targetUserId);
    return this.teamRepository.save(team);
  }

  async removeAdmin(userId: string, teamId: string, targetUserId: string) {
    const team = await this.teamRepository.findOne({ where: { id: teamId }, relations: ['captain'] });
    if (team.captain.id !== userId) throw new ForbiddenException('只有创始人可移除管理员');

    if (team.admins) {
      team.admins = team.admins.filter(id => id !== targetUserId);
    }
    return this.teamRepository.save(team);
  }

  async transferFounder(userId: string, teamId: string, targetUserId: string) {
    const team = await this.teamRepository.findOne({ where: { id: teamId }, relations: ['captain'] });
    if (team.captain.id !== userId) throw new ForbiddenException('无权转让球队');
    
    if (!team.members.includes(targetUserId)) throw new BadRequestException('目标用户不是球队成员');
    
    const newCaptain = await this.userRepository.findOne({ where: { id: targetUserId } });
    team.captain = newCaptain;
    // Remove new captain from admins if they were one
    if (team.admins) {
      team.admins = team.admins.filter(id => id !== targetUserId);
    }
    return this.teamRepository.save(team);
  }

  // Deprecated/Removed: simple join method
  // async join(...) 
}
