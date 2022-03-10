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
export default class CodeEntity extends BaseEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index({ unique: true })
  codeId: string;

  @Column('text')
  content: string;

  @Column({
    default: '',
  })
  title: string;

  @Column({
    default: 'typescript',
  })
  language: string;

  @Column({
    default: 0,
  })
  metaVersion: number;

  @Column()
  version: number;

  @UpdateDateColumn()
  updateTime: Date;

  @CreateDateColumn()
  createTime: Date;

}
