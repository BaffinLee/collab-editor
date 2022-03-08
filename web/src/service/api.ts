import axios from 'axios';
import dayjs from 'dayjs';
import Changeset from '../../../common/model/Changeset';
import { UserInfo } from '../../../common/type';
import { CodeInfo, SnapshotInfo, UploadChangesetResult } from '../type';

axios.defaults.baseURL = process.env.NODE_ENV === 'development' ? '/api' : '';

export async function getUser() {
  const res = await axios.get<UserInfo>('/user');
  return res.data;
}

export async function getCode(codeId?: string) {
  codeId = codeId || location.pathname.split('/')[1] || dayjs().format('YYYYMMDD');
  const res = await axios.get<CodeInfo>(`/code/${codeId}`);
  return res.data;
}

export async function getSnapshot(codeId: string, version: number) {
  const res = await axios.get<SnapshotInfo>(`/history/${codeId}/snapshot`, {
    params: {
      version,
    },
  });
  return res.data;
}

export async function getChangesets(codeId: string, baseVersion: number, targetVersion: number) {
  const res = await axios.get<Changeset[]>(`/changeset/${codeId}`, {
    params: {
      baseVersion,
      targetVersion,
    },
  });
  return res.data;
}

export async function getHistory(codeId: string) {
  const res = await axios.get<Changeset[]>(`/history/${codeId}`);
  return res.data;
}

export async function revertHistory(codeId: string, memberId: number, version: number) {
  const res = await axios.post<UploadChangesetResult>(`/history/${codeId}/revert`, {
    memberId,
    version,
  });
  return res.data;
}

export async function uploadChangesets(codeId: string, memberId: number, baseVersion: number, changesets: Changeset[]) {
  const res = await axios.post<UploadChangesetResult>(`/changeset/${codeId}`, {
    changesets,
    baseVersion,
    memberId,
  });
  return res.data;
}

export async function getMembers(codeId: string) {
  const res = await axios.get<UserInfo[]>(`/code/${codeId}/members`);
  return res.data;
}
