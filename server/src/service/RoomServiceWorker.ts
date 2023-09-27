import { UserInfo, WebSocketState } from "../../../common/type";
import { CursorChangeMessage, HeartbeatMessage, RoomChangeMessage, RoomChangeType, SocketMessage, SocketMessageType } from "../../../common/type/message";
import CodeEntity from "../entity/CodeEntity";
import UserEntity from "../entity/UserEntity";
import RoomEntity, { RoomMember } from "../entity/RoomEntity";

interface ClientInfo {
  codeId: string;
  userId: number;
  memberId: number;
  ws: WebSocket;
  lastTime: Date;
  cursor?: CursorChangeMessage['data']['cursor'];
}

const HEALTH_TIME = 60 * 1000;
const CHECK_ROOM_TIME = 1500;

export default class RoomService {
  static client: ClientInfo;
  static healthCheckTimer: NodeJS.Timer | null = null;
  static roomCheckTimer: NodeJS.Timer | null = null;
  static lastRoomInfo: { version: number; members: RoomMember[] } | null = null;

  static handleConnection(ws: WebSocket, req: Request) {
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

  static async getRoomMemberInfos(members: RoomMember[]) {
    const memberList: UserInfo[] = [];
    for (let i = 0; i < members.length; i++) {
      if (!(members[i].lastSeen > Date.now() - HEALTH_TIME)) continue;
      const user = await UserEntity.findOneBy({ id: members[i].userId });
      user && memberList.push({ ...user, memberId: members[i].memberId });
    }
    return memberList;
  }

  static async getRoomVersion() {
    const room = await this.getRoomRawInfo();
    return room.version;
  }

  static async getRoomRawInfo(codeId?: string) {
    const roomInfo = await RoomEntity.findOneBy({ codeId: codeId || this.client.codeId });
    return {
      version: roomInfo?.version || 0,
      members: roomInfo?.getMembers() || [],
    };
  }

  static async getRoomInfo(codeId?: string) {
    const roomInfo = await this.getRoomRawInfo(codeId);
    return {
      version: roomInfo?.version || 0,
      members: await this.getRoomMemberInfos(roomInfo.members),
    };
  }

  private static handleClose() {
    this.handleRoomChange(RoomChangeType.UserLeave);
    if (this.roomCheckTimer) {
      clearInterval(this.roomCheckTimer);
      this.roomCheckTimer = null;
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
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
    const room = await this.getRoomRawInfo();
    if (!this.lastRoomInfo) {
      this.lastRoomInfo = room;
      return;
    }
    if (room.version === this.lastRoomInfo.version) return;
    const oldMap = this.lastRoomInfo.members.reduce((map, member) => {
      map[member.memberId] = member;
      return map;
    }, {} as { [key: number]: RoomMember });
    const newMap = room.members.reduce((map, member) => {
      map[member.memberId] = member;
      return map;
    }, {} as { [key: number]: RoomMember });
    const enterMembers = room.members.filter(member => !oldMap[member.memberId] && member.memberId !== this.client.memberId);
    const leaveMembers = this.lastRoomInfo.members.filter(member => !newMap[member.memberId] && member.memberId !== this.client.memberId);
    const cursorChangeMembers = room.members.filter(member => {
      const oldMember = oldMap[member.memberId];
      if (member.memberId === this.client.memberId) return false;
      if (!oldMember) return !!member.cursor;
      if (member.cursor && (oldMember.cursor?.[0] !== member.cursor?.[0] || oldMember.cursor?.[1] !== member.cursor?.[1])) return true;
      return false;
    });
    const userInfoMap: { [userId: number]: UserEntity } = {};
    const users = [...enterMembers, ...leaveMembers];
    for (let i = 0; i < users.length; i++) {
      if (userInfoMap[users[i].userId]) continue;
      const info = await UserEntity.findOneBy({ id: users[i].userId });
      if (info) userInfoMap[users[i].userId] = info;
    }
    const roomChanges: RoomChangeMessage['data']['changes'] = [];
    [
      { arr: enterMembers, type: RoomChangeType.UserEnter },
      { arr: leaveMembers, type: RoomChangeType.UserLeave },
    ].forEach(({ arr, type }) => {
      roomChanges.push(...arr.map(user => ({
        type,
        user: {
          ...userInfoMap[user.userId],
          memberId: user.memberId,
        },
      })));
    });
    const roomChangeMessages: RoomChangeMessage[] = roomChanges.length ? [{
      type: SocketMessageType.RoomChange,
      data: {
        changes: roomChanges,
        roomVersion: room.version,
      },
    }] :  [];
    const cursorChanges = cursorChangeMembers.map(item => ({
      type: SocketMessageType.CursorChange,
      data: {
        userId: item.userId,
        memberId: item.memberId,
        cursor: {
          rangeStart: item.cursor![0],
          rangeEnd: item.cursor![1],
        },
      },
    } as CursorChangeMessage));
    this.lastRoomInfo = room;
    if (roomChangeMessages.length || cursorChanges.length) {
      this.client.ws.send(JSON.stringify(([] as SocketMessage[]).concat(roomChangeMessages, cursorChanges)));
    }
  }

  private static async updateRoomVersion(keepVer?: boolean) {
    const room = await this.getRoomRawInfo();
    const index = room.members.findIndex(item => item.memberId === this.client.memberId);
    const data: RoomMember = {
      memberId: this.client.memberId,
      userId: this.client.userId,
      cursor: this.client.cursor && [this.client.cursor.rangeStart, this.client.cursor.rangeEnd],
      lastSeen: Date.now(),
    };
    if (index !== -1) {
      room.members[index] = data;
    } else {
      room.members.push(data);
    }
    if (!keepVer) room.version += 1;
    room.members = room.members.filter(item => item.lastSeen > Date.now() - HEALTH_TIME);
    this.lastRoomInfo = room;
    await RoomEntity.update({ codeId: this.client.codeId }, {
      version: room.version,
      members: JSON.stringify(room.members),
    });
  }

  private static get cacheName() {
    return `room_${this.client.codeId}`;
  }
}
