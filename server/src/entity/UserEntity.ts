import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  BaseEntity,
} from 'typeorm';

@Entity()
export default class UserEntity extends BaseEntity {

  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  avatar: string;

  @UpdateDateColumn({ type: 'date' })
  updateTime: Date;

  @CreateDateColumn({ type: 'date' })
  createTime: Date;

}
