import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from './entities/venue.entity';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
  ) {}

  findAll() {
    return this.venueRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const venue = await this.venueRepository.findOne({ where: { id } });
    if (!venue) throw new NotFoundException('场地不存在');
    return venue;
  }

  create(data: any) {
    const venue = this.venueRepository.create(data);
    return this.venueRepository.save(venue);
  }

  async update(id: string, data: any) {
    await this.venueRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    return this.venueRepository.delete(id);
  }
}
