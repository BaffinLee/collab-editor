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

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  codeId: string;

  @Column('text')
  content: string;

  @Column()
  version: number;

  @UpdateDateColumn()
  updateTime: Date;

  @CreateDateColumn()
  createTime: Date;

}
