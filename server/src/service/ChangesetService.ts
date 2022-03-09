import { Between  } from 'typeorm';
import { checkChangesets } from '../../../common/utils';
import { convertChangesets } from '../../../common/utils/type';
import ChangesetEntity from '../entity/ChangesetEntity';

export default class ChangesetService {
  static async getByRange(codeId: string, baseVersion: number, targetVersion: number) {
    if (baseVersion >= targetVersion) {
      throw new Error('invalid baseVersion or targetVersion');
    }
    const list = await ChangesetEntity.find({
      where: {
        codeId,
        baseVersion: Between(baseVersion, targetVersion - 1),
      },
      order: {
        baseVersion: 'ASC',
      },
    });
    const changesets = convertChangesets(list.map(item => ({ ...item, operations: item.getOperations()})));
    checkChangesets(changesets, baseVersion, targetVersion);
    return changesets;
  }
}
