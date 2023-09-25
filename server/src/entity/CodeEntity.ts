import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  BaseEntity,
  Index,
} from '@edge-js/typeorm';

@Entity()
export default class CodeEntity extends BaseEntity {

  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar' })
  @Index({ unique: true })
  codeId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    default: '',
    type: 'varchar',
  })
  title: string;

  @Column({
    default: 'typescript',
    type: 'varchar',
  })
  language: string;

  @Column({
    default: 0,
    type: 'int',
  })
  metaVersion: number;

  @Column({ type: 'int' })
  version: number;

  @UpdateDateColumn({ type: 'date' })
  updateTime: Date;

  @CreateDateColumn({ type: 'date' })
  createTime: Date;

}
