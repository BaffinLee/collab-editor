import { UserInfo } from "../../../common/type";
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
const CHECK_ROOM_TIME = 1000;

export default class RoomService {
  static client: ClientInfo;
  static healthCheckTimer: NodeJS.Timer | null = null;
  static roomCheckTimer: NodeJS.Timer | null = null;
  static lastRoomInfo: { version: number; members: RoomMember[] } | null = null;
  static userInfoMap: { [userId: number]: Omit<UserInfo, 'memberId'> } = {};

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
      const user = await this.getUserInfo(members[i].userId);
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
      ...roomInfo,
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

  static async updateRoomVersion(info?: {
    keepVer?: boolean,
    isLeaving?: boolean,
    memberId?: number,
    userId?: number,
    codeId?: string,
  }) {
    const codeId = info?.codeId || this.client.codeId;
    const memberId = info?.memberId || this.client.memberId;
    const userId = info?.userId || this.client.userId;
    const room = await this.getRoomRawInfo(codeId);
    const index = room.members.findIndex(item => item.memberId === memberId);
    const data: RoomMember = {
      memberId,
      userId,
      cursor: this.client?.cursor
        ? [this.client.cursor.rangeStart, this.client.cursor.rangeEnd]
        : room.members[index]?.cursor,
      lastSeen: Date.now(),
    };
    if (info?.isLeaving) {
      index !== -1 && room.members.splice(index, 1);
    } else if (index !== -1) {
      room.members[index] = data;
    } else {
      room.members.push(data);
    }
    if (!info?.keepVer) room.version += 1;
    room.members = room.members.filter(item => item.lastSeen > Date.now() - HEALTH_TIME);
    this.lastRoomInfo = room;
    room.id
      ? await RoomEntity.update({ id: room.id }, {
          version: room.version,
          members: JSON.stringify(room.members),
        })
      : await RoomEntity.save({
          codeId,
          version: room.version,
          members: JSON.stringify(room.members),
        });
    return room;
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
          this.updateRoomVersion({ keepVer: true }).then(() => this.handleHeartbeat());
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
    if (!code) {
      return;
    }
    const message: HeartbeatMessage = {
      type: SocketMessageType.Heartbeat,
      data: {
        version: code.version,
        metaVersion: code.metaVersion,
        roomVersion: this.lastRoomInfo?.version || 0,
      },
    };
    this.client.ws.send(JSON.stringify([message]));
  }

  private static async handleRoomChange(type: RoomChangeType) {
    await this.updateRoomVersion({ isLeaving: type === RoomChangeType.UserLeave });
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
    const users = [...enterMembers, ...leaveMembers];
    for (let i = 0; i < users.length; i++) {
      await this.getUserInfo(users[i].userId);
    }
    const roomChanges: RoomChangeMessage['data']['changes'] = [];
    [
      { arr: enterMembers, type: RoomChangeType.UserEnter },
      { arr: leaveMembers, type: RoomChangeType.UserLeave },
    ].forEach(({ arr, type }) => {
      roomChanges.push(...arr.map(user => ({
        type,
        user: {
          ...this.userInfoMap[user.userId],
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
    await this.handleHeartbeat();
    if (roomChangeMessages.length || cursorChanges.length) {
      this.client.ws.send(JSON.stringify(([] as SocketMessage[]).concat(roomChangeMessages, cursorChanges)));
    }
  }

  private static async getUserInfo(userId: number) {
    if (!this.userInfoMap[userId]) {
      const userInfo = await UserEntity.findOneBy({ id: userId });
      userInfo && (this.userInfoMap[userId] = {
        id: userInfo.id,
        avatar: userInfo.avatar,
        name: userInfo.name,
      });
    }
    return this.userInfoMap[userId];
  }
}
