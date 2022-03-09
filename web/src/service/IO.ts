import { UserInfo, WebSocketState } from '../../../common/type';
import { SocketMessage, SocketMessageType } from '../../../common/type/message';
import EventEmitter from '../../../common/utils/EventEmitter';
import { CodeInfo } from '../type';

const HEARTBEAT_TIME = 30;
const MAX_RETRY_TIME = 3;

export default class IO extends EventEmitter {
  private ws: WebSocket;
  private dataQueue: SocketMessage[] = [];
  private retryTimes: number = 0;
  private closed: boolean = false;
  private heartbeatTimer: number = 0;

  constructor(
    private user: UserInfo,
    private code: CodeInfo,
  ) {
    super();
    this.ws = this.initWs();
    this.initHeartbeat();
    document.addEventListener('visibilitychange', this.handleVisibilitychange);
    window.addEventListener('online', this.handleVisibilitychange);
  }

  send(messages: SocketMessage[]) {
    if (!messages.length) {
      return;
    }
    if (this.ws.readyState !== WebSocketState.Ready) {
      this.dataQueue.push(...messages);
      return;
    }
    this.ws.send(JSON.stringify(messages));
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.handleClose();
    this.ws.close();
    window.clearInterval(this.heartbeatTimer);
    document.removeEventListener('visibilitychange', this.handleVisibilitychange);
    window.removeEventListener('online', this.handleVisibilitychange);
  }

  private initWs() {
    const params = `codeId=${encodeURIComponent(this.code.codeId)}&userId=${this.user.id}&memberId=${this.user.memberId}`;
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/socket?${params}`);

    ws.addEventListener('open', this.handleOpen);
    ws.addEventListener('message', this.handleMessage);
    ws.addEventListener('error', this.handleError);
    ws.addEventListener('close', this.handleClose);

    return ws;
  }

  private initHeartbeat() {
    this.heartbeatTimer = window.setInterval(() => {
      this.sendHeartbeat();
    }, HEARTBEAT_TIME * 1000);
  }

  private sendHeartbeat() {
    if (this.ws?.readyState === WebSocketState.Ready) {
      this.send([{
        type: SocketMessageType.Heartbeat,
        data: {},
      }]);
    }
  }

  private flush() {
    this.send(this.dataQueue);
    this.dataQueue = [];
  }

  private handleOpen = () => {
    this.retryTimes = 0;
    this.ws.send('1');
    this.flush();
  }

  private handleMessage = (event: MessageEvent<string>) => {
    try {
      const messages = JSON.parse(event.data);
      Array.isArray(messages) && this.triggerEvent('message', messages);
    } catch (error) {
      // do nothing
    }
  }

  private handleError = (event: Event) => {
    console.error('ws error', event);
    this.handleClose();
    this.ws.close();
  }

  private handleClose = () => {
    this.ws.removeEventListener('open', this.handleOpen);
    this.ws.removeEventListener('message', this.handleMessage);
    this.ws.removeEventListener('error', this.handleError);
    this.ws.removeEventListener('close', this.handleClose);

    if (!this.closed && this.retryTimes < MAX_RETRY_TIME) {
      window.setTimeout(() => {
        if (this.closed || !navigator.onLine) return;
        this.retryTimes += 1;
        this.ws = this.initWs();
      }, (this.retryTimes + 1) * 2 * 1000);
    }
  }

  private handleVisibilitychange = (event: Event) => {
    if (document.visibilityState !== 'visible') {
      return;
    }
    if (this.ws.readyState !== WebSocketState.Ready) {
      this.ws = this.initWs();
    } else {
      this.sendHeartbeat();
    }
  }
}
