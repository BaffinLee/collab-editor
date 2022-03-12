import { UserInfo } from "./index";
import Changeset from "../model/Changeset";

export enum SocketMessageType {
  Heartbeat = 'heartbeat',
  UserChange = 'userChange',
  RoomChange = 'roomChange',
  CursorChange = 'cursorChange',
  MetaChange = 'metaChange',
}

export enum RoomChangeType {
  UserLeave = 'userLeave',
  UserEnter = 'userEnter',
}

export type SocketMessage = HeartbeatMessage
  | UserChangeMessage
  | CursorChangeMessage
  | MetaChangeMessage
  | RoomChangeMessage;

export interface HeartbeatMessage {
  type: SocketMessageType.Heartbeat;
  data: {
    version?: number;
    metaVersion?: number;
    roomVersion?: number;
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
    roomVersion?: number;
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

export interface MetaChangeMessage {
  type: SocketMessageType.MetaChange,
  data: {
    title?: string;
    language?: string;
    metaVersion: number;
  },
}
