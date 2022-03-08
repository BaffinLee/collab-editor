import type { RoomMemberInfo, UserInfo } from "../../../common/type";
import { RoomChangeType, SocketMessage, SocketMessageType } from "../../../common/type/message";
import EventEmitter from "../../../common/utils/EventEmitter";
import type IO from "./IO";

const COLORS = [
  '#F94144', '#F3722C', '#F8961E', '#F9844A', '#F9C74F', '#90BE6D', '#43AA8B', '#4D908E', '#577590', '#277DA1', '#001219', '#005F73', '#0A9396', '#94D2BD', '#E9D8A6', '#EE9B00', '#CA6702', '#BB3E03', '#AE2012', '#9B2226', '#335C67', '#66827A', '#99A88C', '#C9C390', '#F2CA67', '#EBB639', '#D5883F', '#CA703F', '#9E2A2B', '#680929', '#FF2A2E', '#FF9F10', '#829521', '#315F8E', '#634174', '#FCCCB4', '#40798C', '#3D2645', '#CC5803', '#474B24', '#00615C', '#3B9259', '#103D34', '#008482', '#96A540', '#AC5D45', '#9C5A6C', '#7472A0', '#CF0C70', '#E7409E', '#DE2928', '#2E294E', '#398D4F', '#C5D86D', '#0A95B1', '#346BE5',
  "#C62828","#AD1457","#6A1B9A","#4527A0","#283593","#1565C0","#0277BD","#00838F","#00695C","#2E7D32","#558B2F","#9E9D24","#F9A825","#FF8F00","#EF6C00","#D84315","#4E342E","#424242","#37474F",
];

export default class Room extends EventEmitter {
  private members: RoomMemberInfo[];

  constructor(
    members: RoomMemberInfo[],
    private io: IO,
    user: UserInfo,
  ) {
    super();
    this.members = [...members, user].map(member => {
      return {
        ...member,
        color: this.getColor(member.memberId),
      };
    });
    io.addEventListener('message', this.handleMessage);
  }

  getMembers() {
    return this.members;
  }

  updateUserCursor(data: UserInfo & { rangeStart: number }) {
    this.io.send([{
      type: SocketMessageType.CursorChange,
      data: {
        userId: data.id,
        memberId: data.memberId,
        cursor: {
          rangeStart: data.rangeStart,
          rangeEnd: data.rangeStart,
        },
      },
    }]);
  }

  destroy() {
    this.io.removeEventListener('message', this.handleMessage);
  }

  private getColor(memberId: number) {
    return COLORS[memberId % COLORS.length];
  }

  private handleMessage = (messages: SocketMessage[]) => {
    let changed = false;
    messages.forEach(message => {
      if (message.type === SocketMessageType.RoomChange) {
        message.data.changes.forEach(change => {
          if (change.type === RoomChangeType.UserLeave) {
            this.members = this.members.filter(member => member.memberId !== change.user.memberId);
          } else if (!this.members.find(member => member.memberId === change.user.memberId)) {
            this.members = this.members.concat([{
              ...change.user,
              color: this.getColor(change.user.memberId),
            }]);
          }
          changed = true;
        });
      } else if (message.type === SocketMessageType.CursorChange) {
        const index = this.members.findIndex(user => user.memberId === message.data.memberId);
        if (index !== -1) {
          this.members[index].cursor = message.data.cursor;
          this.members = [...this.members];
          changed = true;
        }
      }
    });
    changed && this.triggerEvent('update', this.members);
  }
}
