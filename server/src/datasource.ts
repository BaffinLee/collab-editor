import { DataSource, DataSourceOptions } from "@edge-js/typeorm";
import ChangesetEntity from "./entity/ChangesetEntity";
import CodeEntity from "./entity/CodeEntity";
import SnapshotEntity from "./entity/SnapshotEntity";
import UserEntity from "./entity/UserEntity";
import RoomEntity from "./entity/RoomEntity";

let AppDataSource: DataSource | null = null;

export async function getDataSource(options?: Partial<DataSourceOptions & { type: 'sqlite' }>) {
  if (!AppDataSource) {
    AppDataSource = new DataSource({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [ChangesetEntity, CodeEntity, SnapshotEntity, UserEntity, RoomEntity],
      synchronize: true,
      logging: false,
      ...options,
    });
    await AppDataSource.initialize();
  }
  return AppDataSource;
}
