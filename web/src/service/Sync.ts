import Changeset from "../../../common/model/Changeset";
import EventEmitter from "../../../common/utils/EventEmitter";
import { getChangesets, getCode, uploadChangesets } from "./api";
import type IO from "./IO";
import message from 'antd/lib/message';
import { transformChangesets, TransformType } from "../../../common/transform/transform";
import { SocketMessage, SocketMessageType } from "../../../common/type/message";
import { convertChangesets } from "../../../common/utils/type";
import { UserInfo } from "../../../common/type";
import Offline from "./Offline";
import { checkChangesets } from "../../../common/utils";

export enum SyncState {
  Ready = 'ready',
  Uploading = 'uploading',
  Downloading = 'downloading',
  Error = 'error',
  Offline = 'offline',
}

export default class Sync extends EventEmitter {
  private state = SyncState.Ready;
  private sendingChangesets: Changeset[] = [];
  private pendingChangesets: Changeset[] = [];
  private flushTimer: number = 0;
  private offline: Offline;

  constructor(
    private io: IO,
    private version: number,
    private meteVersion: number,
    private codeId: string,
    private user: UserInfo,
  ) {
    super();
    io.addEventListener('message', this.handleMessage);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('online', this.handleOnline);
    this.offline = new Offline(user, codeId);
    this.offline.addEventListener('fetchMiss', this.fetchMissChanges);
  }

  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    this.io.removeEventListener('message', this.handleMessage);
    this.offline.removeEventListener('fetchMiss', this.fetchMissChanges);
  }

  send(changesets: Changeset[]) {
    this.pendingChangesets.push(...changesets);
    this.offline.saveChangesets([...this.sendingChangesets, ...this.pendingChangesets], this.version);
    this.flush();
  }

  flush(immediately?: boolean) {
    if (this.state !== SyncState.Ready || !this.pendingChangesets.length) {
      return;
    }
    if (this.flushTimer) {
      return;
    }
    this.updateReadyState(SyncState.Uploading);
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = 0;
      this.sendingChangesets = this.pendingChangesets;
      this.pendingChangesets = [];
      this.sendChangesets(this.sendingChangesets);
    }, immediately ? 0 : 1000);
  }

  getVersion() {
    return this.version;
  }

  fetchMissChanges = async (latestVersion: number) => {
    if (this.state !== SyncState.Ready || latestVersion <= this.version) {
      return;
    }
    this.updateReadyState(SyncState.Downloading);
    try {
      let changesets = await getChangesets(this.codeId, this.version, latestVersion);
      changesets = convertChangesets(changesets);
      checkChangesets(changesets, this.version, latestVersion);
      this.pendingChangesets = transformChangesets(this.pendingChangesets, changesets, TransformType.Left)[0];
      this.triggerEvent('serverChangesets', changesets);
      this.version = latestVersion;
      this.updateReadyState(SyncState.Ready);
      this.triggerEvent('versionChange', { version: this.version });
      this.offline.saveChangesets(this.pendingChangesets, this.version);
      this.flush(true);
    } catch (error) {
      console.error('fetchMissChanges error', this.version, latestVersion, error);
      this.updateReadyState(SyncState.Ready);
    }
  }

  private async sendChangesets(changesets: Changeset[], retryTimes = 0) {
    try {
      const data = await uploadChangesets(this.codeId, this.user.memberId, this.version, changesets);
      if (data.version !== this.version + 1) {
        data.changesets = convertChangesets(data.changesets);
        const [clientChangesets, serverChangesets] = transformChangesets(this.pendingChangesets, data.changesets, TransformType.Left);
        this.pendingChangesets = clientChangesets;
        this.triggerEvent('serverChangesets', serverChangesets);
      }
      this.version = data.version;
      this.updateReadyState(SyncState.Ready);
      this.triggerEvent('versionChange', { version: this.version });
      this.sendingChangesets = [];
      this.offline.saveChangesets(this.pendingChangesets, this.version);
      this.flush(true);
    } catch (error) {
      console.error('sendChangesets error', changesets, this.version);
      if (!navigator.onLine) {
        this.updateReadyState(SyncState.Offline);
        this.pendingChangesets = [...this.sendingChangesets, ...this.pendingChangesets];
        this.sendingChangesets = [];
        return;
      } if (retryTimes < 3) {
        setTimeout(() => this.sendChangesets(changesets, retryTimes + 1), (retryTimes + 1) * 2 * 1000);
      } else {
        message.error('Sync error after 3 retries, please refresh.', 0);
        this.updateReadyState(SyncState.Error);
      }
    }
  }

  private handleMessage = (messages: SocketMessage[]) => {
    let changesets: Changeset[] = [];
    messages.forEach(message => {
      if (message.type === SocketMessageType.UserChange) {
        changesets.push(...convertChangesets(message.data.changesets));
      } else if (message.type === SocketMessageType.Heartbeat) {
        message.data.version! > this.version && this.fetchMissChanges(message.data.version!);
        message.data.metaVersion! > this.meteVersion && this.fetchMeta();
      } else if (message.type === SocketMessageType.MetaChange) {
        if (message.data.metaVersion > this.meteVersion) {
          this.meteVersion = message.data.metaVersion;
          this.triggerEvent('metaChange', message.data);
        }
      }
    });

    if (!changesets.length) {
      return;
    }

    checkChangesets(changesets);

    const latestVersion = changesets[changesets.length - 1].baseVersion! + 1;
    if (latestVersion > this.version + 1) {
      this.fetchMissChanges(latestVersion);
    } else if (latestVersion === this.version + 1 && changesets.length === 1 && this.state === SyncState.Ready) {
      const [clientChangesets, serverChangesets] = transformChangesets(this.pendingChangesets, changesets, TransformType.Left);
      this.pendingChangesets = clientChangesets;
      this.triggerEvent('serverChangesets', serverChangesets);
      this.version += 1;
      this.triggerEvent('versionChange', { version: this.version });
      this.offline.saveChangesets(this.pendingChangesets, this.version);
    }
  }

  private handleBeforeUnload = (event: Event) => {
    this.offline.saveChangesets([...this.sendingChangesets, ...this.pendingChangesets], this.version);
    if (this.sendingChangesets.length || this.pendingChangesets.length) {
      event.preventDefault();
    }
  }

  private updateReadyState(state: SyncState) {
    this.state = state;
    this.triggerEvent('stateChange', { state });
  }

  private handleOnline = () => {
    if (this.state === SyncState.Offline) {
      this.state = SyncState.Ready;
    }
    this.flush(true);
  }

  private async fetchMeta() {
    const code = await getCode(this.codeId);
    this.meteVersion = code.metaVersion;
    this.triggerEvent('metaChange', code);
  }
}
