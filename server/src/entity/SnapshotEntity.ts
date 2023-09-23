import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  BaseEntity,
  Index,
} from 'typeorm';

@Entity()
@Index(['codeId', 'version'], { unique: true })
export default class SnapshotEntity extends BaseEntity {

  @PrimaryGeneratedColumn({ type: 'int'})
  id: number;

  @Column({ type: 'varchar' })
  codeId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int' })
  version: number;

  @UpdateDateColumn({ type: 'date' })
  updateTime: Date;

  @CreateDateColumn({ type: 'date' })
  createTime: Date;

}
