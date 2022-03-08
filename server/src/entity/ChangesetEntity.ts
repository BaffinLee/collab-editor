import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  BaseEntity,
  Index,
} from 'typeorm';
import Operation from '../../../common/operation/Operation';
import { convertOperations } from '../../../common/utils/type';

@Entity()
@Index(['codeId', 'baseVersion'], { unique: true })
export default class ChangesetEntity extends BaseEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  codeId: string;

  @Column('text')
  operations: string;

  @Column()
  baseVersion: number;

  @Column()
  userId: number;

  @Column()
  memberId: number;

  @UpdateDateColumn()
  updateTime: Date;

  @CreateDateColumn()
  createTime: Date;

  getOperations(): Operation[] {
    return convertOperations(JSON.parse(this.operations || '[]'));
  }
}
