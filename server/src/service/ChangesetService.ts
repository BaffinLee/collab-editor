import { Between  } from 'typeorm';
import ChangesetEntity from '../entity/ChangesetEntity';

export default class ChangesetService {
  static async save(codeId: string, operations: string, baseVersion: number, userId: number, memberId: number) {
    const changeset = new ChangesetEntity();
    changeset.codeId = codeId;
    changeset.operations = operations;
    changeset.baseVersion = baseVersion;
    changeset.userId = userId;
    changeset.memberId = memberId;
    await changeset.save();
    return changeset;
  }

  static getByRange(codeId: string, baseVersion: number, targetVersion: number) {
    if (baseVersion >= targetVersion) {
      throw new Error('invalid baseVersion or targetVersion');
    }
    return ChangesetEntity.find({
      where: {
        codeId,
        baseVersion: Between(baseVersion, targetVersion - 1),
      },
      order: {
        baseVersion: 'ASC',
      },
    });
  }
}
