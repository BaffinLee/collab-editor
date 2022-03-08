import { UserInfo } from "./index";
import Changeset from "../model/Changeset";

export enum SocketMessageType {
  Heartbeat = 'heartbeat',
  UserChange = 'userChange',
  RoomChange = 'roomChange',
  CursorChange = 'CursorChange',
}

export enum RoomChangeType {
  UserLeave = 'userLeave',
  UserEnter = 'userEnter',
}

export type SocketMessage = HeartbeatMessage
  | UserChangeMessage
  | CursorChangeMessage
  | RoomChangeMessage;

export interface HeartbeatMessage {
  type: SocketMessageType.Heartbeat;
  data: {
    version?: number;
  };
}

export interface UserChangeMessage {
  type: SocketMessageType.UserChange;
  data: {
    changesets: Changeset[],
  };
}

export interface RoomChangeMessage {
  type: SocketMessageType.RoomChange;
  data: {
    changes: {
      type: RoomChangeType;
      user: UserInfo;
    }[];
  };
}

export interface CursorChangeMessage {
  type: SocketMessageType.CursorChange;
  data: {
    userId: number;
    memberId: number;
    cursor: {
      rangeStart: number;
      rangeEnd: number;
    },
  };
}
