import { IncomingMessage } from "http";
import { WebSocket } from "ws";
import { UserInfo, WebSocketState } from "../../../common/type";
import { HeartbeatMessage, RoomChangeType, SocketMessage, SocketMessageType } from "../../../common/type/message";
import CodeEntity from "../entity/CodeEntity";
import UserEntity from "../entity/UserEntity";

interface ClientInfo {
  codeId: string;
  userId: number;
  memberId: number;
  ws: WebSocket;
  lastTime: Date;
}

const HEALTH_TIME = 60 * 1000;

export default class RoomService {
  static connectionMap: {
    [codeId: string]: {
      clients: ClientInfo[];
      version: number;
    } | undefined;
  } = {};
  static healthCheckTimer: NodeJS.Timer | null = null;

  static handleConnection(ws: WebSocket, req: IncomingMessage) {
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
    this.connectionMap[codeId] = this.connectionMap[codeId] || { clients: [], version: 0 };
    this.connectionMap[codeId]!.clients.push(client);
    this.connectionMap[codeId]!.version += 1;

    ws.on('error', event => {
      console.error('ws error', event.message);
      this.handleClose(client);
      ws.close();
    });
    ws.on('close', () => {
      this.handleClose(client);
    });
    ws.on('message', data => {
      try {
        const messages = JSON.parse(data.toString());
        Array.isArray(messages) && this.handleMessages(messages, client);
      } catch (error) {
        // do nothing
      }
      client.lastTime = new Date();
    });

    ws.send('1');

    this.handleRoomChange(client, RoomChangeType.UserEnter);
    this.startHealthCheck();
  }

  static broadcastMessages(messages: SocketMessage[], codeId: string, excludeMember?: number) {
    const clients = this.connectionMap[codeId]?.clients || [];
    clients.forEach(client => {
      if (client.ws.readyState !== WebSocketState.Ready || client.memberId === excludeMember) {
        return;
      }
      client.ws.send(JSON.stringify(messages));
    });
  }

  static async getRoomMembers(codeId: string) {
    const memberList: UserInfo[] = [];
    const arr = this.connectionMap[codeId]?.clients || [];
    for (let i = 0; i < arr.length; i++) {
      const user = await UserEntity.findOneBy({ id: arr[i].userId });
      user && memberList.push({ ...user, memberId: arr[i].memberId });
    }
    return memberList;
  }

  static getRoomVersion(codeId: string) {
    return this.connectionMap[codeId]?.version || 0;
  }

  static async getRoomInfo(codeId: string) {
    return {
      members: await this.getRoomMembers(codeId),
      version: this.getRoomVersion(codeId),
    };
  }

  private static handleClose(client: ClientInfo) {
    if ((this.connectionMap[client.codeId]?.clients || []).find(item => item.memberId === client.memberId)) {
      this.connectionMap[client.codeId]!.clients = this.connectionMap[client.codeId]!.clients.filter(item => item.memberId !== client.memberId);
      this.connectionMap[client.codeId]!.version += 1;
      this.handleRoomChange(client, RoomChangeType.UserLeave);
      if (this.connectionMap[client.codeId]!.clients.length === 0) {
        delete this.connectionMap[client.codeId];
      }
    }
  }

  private static handleMessages(messages: SocketMessage[], client: ClientInfo) {
    messages.forEach(message => {
      switch (message.type) {
        case SocketMessageType.Heartbeat:
          this.handleHeartbeat(client);
          break;
        case SocketMessageType.CursorChange:
          this.broadcastMessages([message], client.codeId, client.memberId);
          break;
      }
    });
  }

  private static async handleHeartbeat(client: ClientInfo) {
    const code = await CodeEntity.findOneBy({ codeId: client.codeId });
    if (!code || client.ws.readyState !== WebSocketState.Ready) {
      return;
    }
    const message: HeartbeatMessage = {
      type: SocketMessageType.Heartbeat,
      data: {
        version: code.version,
        metaVersion: code.metaVersion,
        roomVersion: this.connectionMap[client.codeId]?.version || 0,
      },
    };
    client.ws.send(JSON.stringify([message]));
  }

  private static async handleRoomChange(client: ClientInfo, type: RoomChangeType) {
    const user = await UserEntity.findOneBy({ id: client.userId });
    if (!user) {
      return;
    }
    this.broadcastMessages([{
      type: SocketMessageType.RoomChange,
      data: {
        changes: [
          {
            type,
            user: {
              ...user,
              memberId: client.memberId,
            },
          },
        ],
        roomVersion: this.getRoomVersion(client.codeId),
      },
    }], client.codeId, client.memberId);
  }

  private static startHealthCheck() {
    if (this.healthCheckTimer) return;
    this.healthCheckTimer = setInterval(() => {
      Object.keys(this.connectionMap).forEach(codeId => {
        const list = this.connectionMap[codeId]!.clients;
        for (let i = list.length - 1; i >= 0; i--) {
          const item = list[i];
          if (item.lastTime.getTime() + HEALTH_TIME < (new Date()).getTime()) {
            this.handleClose(item);
            item.ws.close();
          }
        }
      });
    }, HEALTH_TIME);
  }
}
