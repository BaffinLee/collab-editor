import type { Context } from "koa";
import { UserInfo, WebSocketState } from "../../../common/type";
import { CursorChangeMessage, HeartbeatMessage, RoomChangeMessage, RoomChangeType, SocketMessage, SocketMessageType } from "../../../common/type/message";
import CodeEntity from "../entity/CodeEntity";
import UserEntity from "../entity/UserEntity";

interface ClientInfo {
  codeId: string;
  userId: number;
  memberId: number;
  ws: WebSocket;
  lastTime: Date;
  cursor?: CursorChangeMessage['data']['cursor'];
}

interface RoomMemberInfo {
  u: number;
  m: number;
  c?: number[];
  l: number;
}

interface RoomInfo {
  v: number;
  m: RoomMemberInfo[];
}

const HEALTH_TIME = 60 * 1000;
const CHECK_ROOM_TIME = 1500;
const CACHE_TTL = 90 * 1000;

export default class RoomService {
  static client: ClientInfo;
  static healthCheckTimer: NodeJS.Timer | null = null;
  static roomCheckTimer: NodeJS.Timer | null = null;
  static env: Env;
  static lastRoomInfo: RoomInfo | null = null;

  static handleConnection(ws: WebSocket, req: Request, env: Env) {
    const url = new URL(req.url || '', 'http://127.0.0.1');
    const codeId = url.searchParams.get('codeId');
    const userId = Number(url.searchParams.get('userId'));
    const memberId = Number(url.searchParams.get('memberId'));
    if (!codeId || !userId || !memberId) {
      ws.close();
      return;
    }

    const client = {
      codeId,
      userId,
      memberId,
      ws,
      lastTime: new Date(),
    };
    this.client = client;
    this.env = env;

    ws.addEventListener('error', event => {
      console.error('ws error', event.message);
      this.handleClose();
      ws.close();
    });
    ws.addEventListener('close', () => {
      this.handleClose();
    });
    ws.addEventListener('message', ({ data }) => {
      try {
        const messages = JSON.parse(data.toString());
        Array.isArray(messages) && this.handleMessages(messages);
      } catch (error) {
        // do nothing
      }
      client.lastTime = new Date();
    });

    ws.send('1');

    this.handleRoomChange(RoomChangeType.UserEnter);
    this.startHealthCheck();
    this.startRoomCheck();
  }

  static async getRoomMembers(codeId: string, ctx?: Context) {
    ctx && !this.env && (this.env = ctx.env);
    ctx && !this.client && (this.client = { codeId } as any);
    const room = await this.getRoomInfo();
    const memberList: UserInfo[] = [];
    for (let i = 0; i < room.m.length; i++) {
      if (!(room.m[i].l > Date.now() - HEALTH_TIME)) continue;
      const user = await UserEntity.findOneBy({ id: room.m[i].u });
      user && memberList.push({ ...user, memberId: room.m[i].m });
    }
    return memberList;
  }

  static async getRoomVersion(codeId?: string, ctx?: Context) {
    ctx && !this.env && (this.env = ctx.env);
    ctx && !this.client && (this.client = { codeId } as any);
    const room = await this.getRoomInfo();
    return room.v;
  }

  static async getRoomInfo() {
    const str = await this.env.CollaEditorKV.get(this.cacheName);
    const room: RoomInfo = JSON.parse(str || '{ "v": 0, "m": [] }');
    return room;
  }

  private static handleClose() {
    this.handleRoomChange(RoomChangeType.UserLeave);
  }

  private static handleMessages(messages: SocketMessage[]) {
    messages.forEach(message => {
      switch (message.type) {
        case SocketMessageType.Heartbeat:
          this.handleHeartbeat();
          this.updateRoomVersion(true);
          break;
        case SocketMessageType.CursorChange:
          this.client.cursor = message.data.cursor;
          this.updateRoomVersion();
          break;
      }
    });
  }

  private static async handleHeartbeat() {
    const code = await CodeEntity.findOneBy({ codeId: this.client.codeId });
    if (!code || this.client.ws.readyState !== WebSocketState.Ready) {
      return;
    }
    const message: HeartbeatMessage = {
      type: SocketMessageType.Heartbeat,
      data: {
        version: code.version,
        metaVersion: code.metaVersion,
        roomVersion: await this.getRoomVersion(),
      },
    };
    this.client.ws.send(JSON.stringify([message]));
  }

  private static async handleRoomChange(type: RoomChangeType) {
    await this.updateRoomVersion();
  }

  private static startHealthCheck() {
    if (this.healthCheckTimer) return;
    this.healthCheckTimer = setInterval(() => {
      if (this.client.lastTime.getTime() + HEALTH_TIME < (new Date()).getTime()) {
        this.handleClose();
        this.client.ws.close();
      }
    }, HEALTH_TIME);
  }

  private static startRoomCheck() {
    if (this.roomCheckTimer) return;
    this.roomCheckTimer = setInterval(() => {
      this.checkRoomVersion();
    }, CHECK_ROOM_TIME);
  }

  private static async checkRoomVersion() {
    if (!this.lastRoomInfo) return;
    const str = await this.env.CollaEditorKV.get(this.cacheName);
    if (!str) return;
    const room: RoomInfo = JSON.parse(str);
    if (room.v === this.lastRoomInfo.v) return;
    const oldMap = this.lastRoomInfo.m.reduce((map, member) => {
      map[member.m] = member;
      return map;
    }, {} as { [key: number]: RoomMemberInfo });
    const newMap = room.m.reduce((map, member) => {
      map[member.m] = member;
      return map;
    }, {} as { [key: number]: RoomMemberInfo });
    const enterMembers = room.m.filter(member => !oldMap[member.m]);
    const leaveMembers = this.lastRoomInfo.m.filter(member => !newMap[member.m]);
    const cursorChangeMembers = room.m.filter(member => {
      const oldMember = oldMap[member.m];
      if (!oldMember) return !!member.c;
      if (member.c && (oldMember.c?.[0] !== member.c?.[0] || oldMember.c?.[1] !== member.c?.[1])) return true;
      return false;
    });
    const userInfoMap: { [userId: number]: UserEntity } = {};
    const users = [...enterMembers, ...leaveMembers];
    for (let i = 0; i < users.length; i++) {
      if (userInfoMap[users[i].u]) continue;
      const info = await UserEntity.findOneBy({ id: users[i].u });
      if (info) userInfoMap[users[i].u] = info;
    }
    const roomChanges: RoomChangeMessage[] = [];
    [
      { arr: enterMembers, type: RoomChangeType.UserEnter },
      { arr: leaveMembers, type: RoomChangeType.UserLeave },
    ].forEach(({ arr, type }) => {
      roomChanges.push({
        type: SocketMessageType.RoomChange,
        data: {
          changes: arr.map(user => ({
            type,
            user: {
              ...userInfoMap[user.u],
              memberId: user.m,
            },
          })),
          roomVersion: room.v,
        },
      });
    });
    const cursorChanges = cursorChangeMembers.map(item => ({
      type: SocketMessageType.CursorChange,
      data: {
        userId: item.u,
        memberId: item.m,
        cursor: {
          rangeStart: item.c![0],
          rangeEnd: item.c![1],
        },
      },
    } as CursorChangeMessage));
    this.lastRoomInfo = room;
    if (roomChanges.length || cursorChanges.length) {
      this.client.ws.send(JSON.stringify(([] as any[]).concat(roomChanges, cursorChanges)));
    }
  }

  private static async updateRoomVersion(keepVer?: boolean) {
    const room = await this.getRoomInfo();
    const index = room.m.findIndex(item => item.m === this.client.memberId);
    const data: RoomMemberInfo = {
      m: this.client.memberId,
      u: this.client.userId,
      c: this.client.cursor && [this.client.cursor.rangeStart, this.client.cursor.rangeEnd],
      l: Date.now(),
    };
    if (index !== -1) {
      room.m[index] = data;
    } else {
      room.m.push(data);
    }
    if (!keepVer) room.v += 1;
    room.m = room.m.filter(item => item.l > Date.now() - HEALTH_TIME);
    this.lastRoomInfo = room;
    await this.env.CollaEditorKV.put(this.cacheName, JSON.stringify(room), {
      expirationTtl: CACHE_TTL,
    });
  }

  private static get cacheName() {
    return `room_${this.client.codeId}`;
  }
}
