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
}

export default class RoomService {
  static connectionMap: {
    [codeId: string]: ClientInfo[];
  } = {};

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
    };
    this.connectionMap[codeId] = this.connectionMap[codeId] || [];
    this.connectionMap[codeId].push(client);

    ws.on('error', event => {
      console.error('ws error', event.message);
      this.handleClose(client);
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
    });

    ws.send('1');

    this.handleRoomChange(client, RoomChangeType.UserEnter);
  }

  static broadcastMessages(messages: SocketMessage[], codeId: string, excludeMember?: number) {
    const clients = this.connectionMap[codeId] || [];
    clients.forEach(client => {
      if (client.ws.readyState !== WebSocketState.Ready || client.memberId === excludeMember) {
        return;
      }
      client.ws.send(JSON.stringify(messages));
    });
  }

  static async getRoomMembers(codeId: string) {
    const memberList: UserInfo[] = [];
    const arr = this.connectionMap[codeId] || [];
    for (let i = 0; i < arr.length; i++) {
      const user = await UserEntity.findOne(arr[i].userId);
      user && memberList.push({ ...user, memberId: arr[i].memberId });
    }
    return memberList;
  }

  private static handleClose(client: ClientInfo) {
    if ((this.connectionMap[client.codeId] || []).find(item => item.memberId === client.memberId)) {
      this.connectionMap[client.codeId] = (this.connectionMap[client.codeId] || []).filter(item => item.memberId !== client.memberId);
      this.handleRoomChange(client, RoomChangeType.UserLeave);
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
    const code = await CodeEntity.findOne({ codeId: client.codeId });
    if (!code || client.ws.readyState !== WebSocketState.Ready) {
      return;
    }
    const message: HeartbeatMessage = {
      type: SocketMessageType.Heartbeat,
      data: {
        version: code.version,
      },
    };
    client.ws.send(JSON.stringify([message]));
  }

  private static async handleRoomChange(client: ClientInfo, type: RoomChangeType) {
    const user = await UserEntity.findOne(client.userId);
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
      },
    }], client.codeId, client.memberId);
  }
}
