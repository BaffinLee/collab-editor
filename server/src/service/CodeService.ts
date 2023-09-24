import { DEFAULT_CODE } from '../../../common/utils/text';
import CodeEntity from '../entity/CodeEntity';
import { SNAPSHOT_NUM } from './SnapshotService';
import { EntityManager } from '@edge-js/typeorm';
import SnapshotEntity from '../entity/SnapshotEntity';
import { getDataSource } from '../datasource';

export default class CodeService {
  static async getOrCreate(codeId: string) {
    return await CodeEntity.findOneBy({ codeId }) || this.save(DEFAULT_CODE, 0, codeId);
  }

  static async save(content: string, version: number, codeOrId: CodeEntity | string, manager?: EntityManager) {
    const isCreate = typeof codeOrId === 'string';
    const code = isCreate ? new CodeEntity() : codeOrId;

    const save = async (transactionalEntityManager: EntityManager) => {
      if (isCreate) code.codeId = codeOrId;
      code.content = content;
      code.version = version;
      await transactionalEntityManager.save(code);
  
      if (version % SNAPSHOT_NUM === 0) {
        const snapshot = new SnapshotEntity();
        snapshot.codeId = code.codeId;
        snapshot.content = content;
        snapshot.version = version;
        await transactionalEntityManager.save(snapshot);
      }
    };

    if (manager) {
      await save(manager);
    } else {
      await (await getDataSource()).transaction(save);
    }

    return code;
  }
}
