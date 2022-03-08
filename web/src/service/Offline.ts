import Changeset from "../../../common/model/Changeset";
import { UserInfo } from "../../../common/type";
import EventEmitter from "../../../common/utils/EventEmitter";
import { convertChangesets } from "../../../common/utils/type";
import { uploadChangesets } from "./api";

interface OfflineData {
  baseVersion: number;
  changesets: Changeset[];
  userId: number;
  memberId: number;
  codeId: string;
}

export default class Offline extends EventEmitter {
  constructor(
    private user: UserInfo,
    private codeId: string,
  ) {
    super();
    this.processOfflineData();
  }

  saveChangesets(changesets: Changeset[], baseVersion: number) {
    if (!changesets.length) {
      this.deleteOfflineData();
      return;
    }
    if (navigator.onLine) {
      return;
    }
    localStorage.setItem(this.getKey(), JSON.stringify({
      baseVersion,
      changesets,
      userId: this.user.id,
      memberId: this.user.memberId,
      codeId: this.codeId,
    }));
  }

  private deleteOfflineData() {
    localStorage.removeItem(this.getKey());
  }

  private getKey(userId = this.user.id, memberId = this.user.memberId, codeId = this.codeId) {
    return `collo_editor_offline_${userId}_${codeId}_${memberId}`;
  }

  private processOfflineData() {
    const list: OfflineData[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`collo_editor_offline_${this.user.id}_`)) {
        const content = localStorage.getItem(key);
        const data = content && this.parseData(content);
        data && list.push(data);
      }
    }
    this.handleOfflineData(list);
  }

  private async handleOfflineData(list: OfflineData[]) {
    for (let i = 0; i < list.length; i++) {
      try {
        if (!navigator.onLine) return;
        const item = list[i];
        const res = await uploadChangesets(item.codeId, item.memberId, item.baseVersion, convertChangesets(item.changesets));
        localStorage.removeItem(this.getKey(this.user.id, item.memberId, item.codeId));
        if (item.codeId === this.codeId) {
          this.triggerEvent('fetchMiss', res.version);
        }
      } catch (error) {
        console.error('upload offline changesets error', error);
        continue;
      }
    }
  }

  private parseData(data: string) {
    try {
      const info = JSON.parse(data);
      if (info.baseVersion && Array.isArray(info.changesets) && info.userId && info.memberId && info.codeId) {
        return info;
      }
    } catch (err) {
      // do nothing
    }
    return null;
  }
}
