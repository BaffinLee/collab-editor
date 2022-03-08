import type Changeset from "../model/Changeset";
import type { ApplyType } from "../model/Model";

export enum WebSocketState {
  Ready = 1,
}

export interface UserInfo {
  id: number;
  memberId: number;
  name: string;
  avatar: string;
}

export interface RoomMemberInfo extends UserInfo {
  color?: string;
}

export interface ModelUpdateEvent {
  changesets: Changeset[];
  applyType: ApplyType;
}
