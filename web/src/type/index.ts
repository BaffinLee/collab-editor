import Changeset from '../../../common/model/Changeset';
import Operation from '../../../common/operation/Operation';

export interface CodeInfo {
  codeId: string;
  content: string;
  version: number;
}

export interface SnapshotInfo {
  version: number;
  content: string;
}

export interface ChangesetInfo {
  baseVersion: number;
  operations: Operation[];
  userId: number;
  memberId: number;
}

export interface UploadChangesetResult {
  version: number;
  changesets: Changeset[];
}
