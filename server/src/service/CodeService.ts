import { DEFAULT_CODE } from '../../../common/utils/text';
import CodeEntity from '../entity/CodeEntity';
import SnapshotService, { SNAPSHOT_NUM } from './SnapshotService';

export default class CodeService {
  static async getOrCreate(codeId: string) {
    return await CodeEntity.findOne({ codeId }) || this.save(DEFAULT_CODE, 0, codeId);
  }

  static async update(content: string, version: number, codeId: string) {
    const code = await CodeEntity.findOne({ codeId });
    if (!code) {
      throw new Error('codeId not exist');
    }
    return this.save(content, version, code);
  }

  static async save(content: string, version: number, codeOrId: CodeEntity | string) {
    const isCreate = typeof codeOrId === 'string';
    const code = isCreate ? new CodeEntity() : codeOrId;
    if (isCreate) code.codeId = codeOrId;
    code.content = content;
    code.version = version;
    await code.save();

    if (version % SNAPSHOT_NUM === 0) {
      await SnapshotService.save(content, version, code.codeId);
    }

    return code;
  }
}
