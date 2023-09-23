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

  @PrimaryGeneratedColumn({ type: 'int'})
  id: number;

  @Column({ type: 'varchar'})
  codeId: string;

  @Column('text')
  operations: string;

  @Column({ type: 'int'})
  baseVersion: number;

  @Column({ type: 'int'})
  userId: number;

  @Column({ type: 'int'})
  memberId: number;

  @UpdateDateColumn({ type: 'date'})
  updateTime: Date;

  @CreateDateColumn({ type: 'date'})
  createTime: Date;

  getOperations(): Operation[] {
    return convertOperations(JSON.parse(this.operations || '[]'));
  }
}
