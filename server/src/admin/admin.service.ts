import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, In } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Match, MatchType } from '../matches/entities/match.entity';
import { MatchRegistration } from '../matches/entities/match-registration.entity';
import { Team } from '../teams/entities/team.entity';
import { Announcement } from './entities/announcement.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

import * as ExcelJS from 'exceljs';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(MatchRegistration)
    private matchRegistrationRepository: Repository<MatchRegistration>,
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(Announcement)
    private announcementRepository: Repository<Announcement>,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initAdmin();
  }

  async getUsers(keyword?: string, certification?: string) {
    const query = this.userRepository.createQueryBuilder('user');

    if (keyword) {
      query.andWhere('(user.name LIKE :keyword OR user.phone LIKE :keyword OR user.id LIKE :keyword)', { keyword: `%${keyword}%` });
    }

    if (certification) {
      if (certification === '未认证') {
         query.andWhere('(user.certifications IS NULL OR user.certifications = "")');
      } else {
         query.andWhere('user.certifications LIKE :cert', { cert: `%${certification}%` });
      }
    }

    query.orderBy('user.createdAt', 'DESC');
    return query.getMany();
  }

  async resetPassword(userId: string, newPass: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('用户不存在');
    
    user.password = await bcrypt.hash(newPass, 10);
    this.sanitizeUser(user);
    return this.userRepository.save(user);
  }

  async auditRadar(userId: string, status: 'approved' | 'rejected') {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    user.radarDataStatus = status;
    this.sanitizeUser(user);
    return this.userRepository.save(user);
  }

  private sanitizeUser(user: User) {
      // Sanitize jerseyNumber
      if (typeof user.jerseyNumber === 'number' && isNaN(user.jerseyNumber)) {
        user.jerseyNumber = 0;
      }

      if (user.stats) {
        Object.keys(user.stats).forEach(k => {
           if (typeof user.stats[k] === 'number' && isNaN(user.stats[k])) {
             user.stats[k] = 0;
           }
        });
      }
     if (user.radarData) {
       Object.keys(user.radarData).forEach(k => {
          if (typeof user.radarData[k] === 'number' && isNaN(user.radarData[k])) {
            user.radarData[k] = 50;
          }
       });
     }
     if (user.sportsProfile) {
        ['age', 'footballAge', 'height', 'weight'].forEach(k => {
           if (typeof user.sportsProfile[k] === 'number' && isNaN(user.sportsProfile[k])) {
              user.sportsProfile[k] = 0;
           }
        });
     }
  }

  async certifyTeam(teamId: string, isCertified: boolean) {
    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) throw new Error('Team not found');
    team.isCertified = isCertified;
    return this.teamRepository.save(team);
  }

  async exportUsersExcel(keyword?: string, certification?: string): Promise<Buffer> {
    const users = await this.getUsers(keyword, certification);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: '姓名', key: 'name', width: 15 },
      { header: '手机号', key: 'phone', width: 15 },
      { header: '角色', key: 'role', width: 10 },
      { header: '认证', key: 'certifications', width: 20 },
      { header: '裁判等级', key: 'refereeLevel', width: 15 },
      { header: '教练等级', key: 'coachLevel', width: 15 },
      { header: '真实姓名', key: 'realName', width: 15 },
      { header: '身份证', key: 'idCard', width: 20 },
      { header: '性别', key: 'gender', width: 10 },
      { header: '球龄', key: 'age', width: 10 },
      { header: '擅长位置', key: 'position', width: 20 },
      { header: '参赛次数', key: 'matches', width: 10 },
      { header: '进球', key: 'goals', width: 10 },
      { header: '助攻', key: 'assists', width: 10 },
      { header: '注册时间', key: 'createdAt', width: 20 },
    ];

    users.forEach(u => {
      const sports = u.sportsProfile || {};
      const stats = u.stats || {};
      worksheet.addRow({
        id: u.id,
        name: u.name,
        phone: u.phone,
        role: u.role,
        certifications: (u.certifications || []).join(', '),
        refereeLevel: u.refereeLevel || '',
        coachLevel: u.coachLevel || '',
        realName: u.realName || '',
        idCard: u.idCard || '',
        gender: sports.gender === '1' ? '男' : sports.gender === '2' ? '女' : '',
        age: sports.age ? `${sports.age}年` : '',
        position: Array.isArray(sports.position) ? sports.position.join(',') : (sports.position || ''),
        matches: stats.matches || 0,
        goals: stats.goals || 0,
        assists: stats.assists || 0,
        createdAt: u.createdAt
      });
    });

    return await workbook.xlsx.writeBuffer() as any as Buffer;
  }

  async getAllMatches() {
    return this.matchRepository.find({
      order: { startTime: 'DESC' },
      relations: ['registrations', 'teamRegistrations']
    });
  }

  async updateMatch(id: number, data: any) {
    const match = await this.matchRepository.findOne({ where: { id } });
    if (!match) throw new Error('赛事不存在');

    // Parse dates
    if (data.startTime) match.startTime = new Date(data.startTime);
    if (data.endTime) match.endTime = new Date(data.endTime);
    if (data.registrationStartTime) match.registrationStartTime = new Date(data.registrationStartTime);
    if (data.registrationEndTime) match.registrationEndTime = new Date(data.registrationEndTime);
    
    // Update other fields
    Object.assign(match, {
        title: data.title,
        coverUrl: data.coverUrl,
        maxTeams: data.maxTeams ? parseInt(data.maxTeams) : match.maxTeams,
        description: data.description,
        location: data.location,
        tags: data.tags,
        status: data.status || match.status
    });

    return this.matchRepository.save(match);
  }

  async deleteMatch(id: number) {
      return this.matchRepository.delete(id);
  }

  async exportMatchesExcel(): Promise<Buffer> {
      const matches = await this.matchRepository.find({
          relations: ['registrations', 'registrations.user', 'teamRegistrations', 'teamRegistrations.team'],
          order: { startTime: 'DESC' }
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Matches');

      worksheet.columns = [
          { header: '赛事ID', key: 'id', width: 10 },
          { header: '赛事名称', key: 'title', width: 20 },
          { header: '类型', key: 'type', width: 15 },
          { header: '状态', key: 'status', width: 10 },
          { header: '开始时间', key: 'startTime', width: 20 },
          { header: '地点', key: 'location', width: 20 },
          { header: '报名人数/队伍', key: 'count', width: 15 },
          { header: '报名详情', key: 'details', width: 50 },
      ];

      for (const m of matches) {
          let details = '';
          let count = '';
          
          if (m.type === MatchType.LEAGUE || m.type === MatchType.TEAM_FRIENDLY) {
              const teams = m.teamRegistrations || [];
              count = `${teams.length} 支队伍`;
              details = teams.map(tr => tr.team?.name).join(', ');
          } else {
              const regs = m.registrations || [];
              count = `${regs.length} 人`;
              details = regs.map(r => r.user?.name).join(', ');
          }

          worksheet.addRow({
              id: m.id,
              title: m.title,
              type: m.type,
              status: m.status,
              startTime: m.startTime,
              location: m.location,
              count: count,
              details: details
          });
      }

      return await workbook.xlsx.writeBuffer() as any as Buffer;
  }

  async exportMatchRegistrations(matchId: number): Promise<Buffer> {
    const match = await this.matchRepository.findOne({ where: { id: matchId } });
    if (!match) throw new Error('赛事不存在');

    const regs = await this.matchRegistrationRepository.find({
      where: { match: { id: matchId } },
      relations: ['team', 'team.captain'],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registrations');

    worksheet.columns = [
      { header: '球队名称', key: 'teamName', width: 20 },
      { header: '领队', key: 'captain', width: 15 },
      { header: '领队电话', key: 'phone', width: 15 },
      { header: '报名人数', key: 'count', width: 10 },
      { header: '状态', key: 'status', width: 10 },
      { header: '球员列表 (姓名/号码/身份证/位置/头像)', key: 'players', width: 100 },
    ];

    for (const reg of regs) {
      let playerDetails = '';
      if (reg.playerIds && reg.playerIds.length > 0) {
          const players = await this.userRepository.find({
             where: { id: In(reg.playerIds) },
             select: ['name', 'jerseyNumber', 'idCard', 'sportsProfile', 'avatar']
          });
          
          playerDetails = players.map(p => {
              const posRaw = Array.isArray(p.sportsProfile?.position) 
                 ? p.sportsProfile?.position.join(',') 
                 : (p.sportsProfile?.position || '');
              
              // Simple map for common EN positions to CN
              let pos = posRaw;
              if (pos === 'FW') pos = '前锋';
              else if (pos === 'MF') pos = '中场';
              else if (pos === 'DF') pos = '后卫';
              else if (pos === 'GK') pos = '门将';
              
              const avatar = p.avatar || '无';
              return `${p.name}(${p.jerseyNumber}) ${p.idCard || '无身份证'} [${pos}] {${avatar}}`;
          }).join('; \n');
      }

      worksheet.addRow({
        teamName: reg.team?.name,
        captain: reg.team?.captain?.name,
        phone: reg.team?.captain?.phone,
        count: reg.playerIds?.length || 0,
        status: reg.status === 'approved' ? '已通过' : (reg.status === 'rejected' ? '已拒绝' : '待审核'),
        players: playerDetails
      });
    }

    return await workbook.xlsx.writeBuffer() as any as Buffer;
  }

  async getTeams() {
    return this.teamRepository.find({ relations: ['captain'], order: { createdAt: 'DESC' } });
  }

  async createMatch(data: any) {
    const maxTeams = data.maxTeams ? parseInt(data.maxTeams) : 16;
    
    // Parse dates if they are strings
    const regStart = data.registrationStartTime ? new Date(data.registrationStartTime) : null;
    const regEnd = data.registrationEndTime ? new Date(data.registrationEndTime) : null;
    const start = data.startTime ? new Date(data.startTime) : null;
    const end = data.endTime ? new Date(data.endTime) : null;

    const match = this.matchRepository.create({
      ...data,
      date: data.startTime ? data.startTime.split(' ')[0] : new Date().toISOString().split('T')[0],
      startTime: start,
      endTime: end,
      status: 'registering',
      type: MatchType.LEAGUE,
      teams: `0/${maxTeams}`,
      maxTeams: maxTeams,
      registrationStartTime: regStart,
      registrationEndTime: regEnd
    });
    return this.matchRepository.save(match);
  }

  // 初始化管理员账号
  async initAdmin() {
    const adminPhone = '19999999999';
    // 优先从环境变量获取密码，否则使用默认值
    const targetPassword = this.configService.get<string>('ADMIN_INIT_PASSWORD') || 'admin888';
    let admin = await this.userRepository.findOne({ where: { phone: adminPhone } });
    
    if (!admin) {
      this.logger.log('正在初始化超级管理员账号...');
      const hashedPassword = await bcrypt.hash(targetPassword, 10);
      admin = this.userRepository.create({
        phone: adminPhone,
        password: hashedPassword, // 默认密码
        name: '系统管理员',
        role: 'super_admin',
        certifications: ['官方认证'],
      });
      const savedAdmin = await this.userRepository.save(admin);
      savedAdmin.id = (10000 + savedAdmin._id).toString();
      await this.userRepository.save(savedAdmin);
      this.logger.log(`超级管理员账号初始化完成: ${adminPhone}`);
    } else {
      let changed = false;
      if (admin.role !== 'super_admin') {
        admin.role = 'super_admin';
        changed = true;
      }
      
      // Check password
      let isMatch = false;
      try {
        isMatch = await bcrypt.compare(targetPassword, admin.password);
      } catch (e) {}
      
      // If not match hash, and not match plain text
      if (!isMatch && admin.password !== targetPassword) {
         // Reset to default
         admin.password = await bcrypt.hash(targetPassword, 10);
         changed = true;
         this.logger.log('管理员密码已重置为默认');
      } else if (admin.password === targetPassword) {
         // If is plain text, upgrade to hash
         admin.password = await bcrypt.hash(targetPassword, 10);
         changed = true;
         this.logger.log('管理员密码已升级为Hash');
      }
      
      if (changed) {
        await this.userRepository.save(admin);
        this.logger.log(`超级管理员账号已更新`);
      }
    }
  }

  async addSystemAdmin(targetUserId: string) {
    const user = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!user) throw new Error('用户不存在');
    user.role = 'admin';
    return this.userRepository.save(user);
  }

  async verifyAdmin(userId: string, requireSuperAdmin: boolean = false): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return false;
    if (requireSuperAdmin) {
      return user.role === 'super_admin';
    }
    return user.role === 'admin' || user.role === 'super_admin';
  }

  async updateUserCertification(userId: string, data: any) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new Error('用户不存在');
      
      // Update multiple certifications
      if (data.certifications && Array.isArray(data.certifications)) {
        user.certifications = data.certifications;
      }
      
      if (data.refereeLevel !== undefined) {
        user.refereeLevel = data.refereeLevel;
      }
      
      if (data.coachLevel !== undefined) {
        user.coachLevel = data.coachLevel;
      }

      if (data.certificationStatus) {
        user.certificationStatus = data.certificationStatus;
        
        // Notify user
        if (data.certificationStatus === 'approved' || data.certificationStatus === 'rejected') {
          const isApproved = data.certificationStatus === 'approved';
          await this.notificationsService.create(
            user.id,
            '认证审核结果',
            `您的认证申请${isApproved ? '已通过' : '被拒绝'}${isApproved ? '，请在个人中心查看' : ''}`,
            NotificationType.CERTIFICATION_RESULT
          );
        }
      }
      
      // Sanitize NaN values to prevent SQLITE_ERROR
      this.sanitizeUser(user);

      return await this.userRepository.save(user);
    } catch (error) {
      this.logger.error(`Update certification failed for user ${userId}`, error.stack);
      throw error;
    }
  }

  async createAnnouncement(title: string, content: string) {
    const announcement = this.announcementRepository.create({ title, content });
    return this.announcementRepository.save(announcement);
  }

  async deleteAnnouncement(id: string) {
    return this.announcementRepository.delete(id);
  }

  async getAnnouncements() {
    return this.announcementRepository.find({ order: { createdAt: 'DESC' } });
  }
}
