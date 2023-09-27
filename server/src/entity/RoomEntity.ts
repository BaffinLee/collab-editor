import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  BaseEntity,
  Index,
} from '@edge-js/typeorm';

export interface RoomMember {
  memberId: number;
  userId: number;
  lastSeen: number;
  cursor?: [number, number];
}

@Entity()
@Index(['codeId'], { unique: true })
export default class RoomEntity extends BaseEntity {

  @PrimaryGeneratedColumn({ type: 'int'})
  id: number;

  @Column({ type: 'varchar'})
  codeId: string;

  @Column('text')
  members: string;

  @Column({ type: 'int'})
  version: number;

  @UpdateDateColumn({ type: 'date'})
  updateTime: Date;

  @CreateDateColumn({ type: 'date'})
  createTime: Date;

  getMembers(): RoomMember[] {
    return JSON.parse(this.members || '[]');
  }
}
