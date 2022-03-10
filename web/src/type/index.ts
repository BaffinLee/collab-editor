import Changeset from '../../../common/model/Changeset';
import Operation from '../../../common/operation/Operation';

export interface CodeInfo {
  codeId: string;
  content: string;
  version: number;
  metaVersion: number;
  title: string;
  language: string;
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

export interface CodeMeta {
  title: string;
  language: string;
}
