import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ad } from './entities/ad.entity';

@Injectable()
export class AdsService {
  constructor(
    @InjectRepository(Ad)
    private adsRepository: Repository<Ad>,
  ) {}

  async findAll() {
    return this.adsRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'DESC', createdAt: 'DESC' },
    });
  }

  async findAllAdmin() {
    return this.adsRepository.find({
      order: { sortOrder: 'DESC', createdAt: 'DESC' },
    });
  }

  async create(data: Partial<Ad>) {
    const ad = this.adsRepository.create(data);
    return this.adsRepository.save(ad);
  }

  async update(id: string, data: Partial<Ad>) {
    await this.adsRepository.update(id, data);
    return this.adsRepository.findOne({ where: { id } });
  }

  async delete(id: string) {
    return this.adsRepository.delete(id);
  }
}
