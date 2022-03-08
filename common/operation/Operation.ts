import type Model from "../model/Model";
import { assertNever } from "../utils/type";

export enum OperationType {
  Insert = 1,
  Update = 2,
  Delete = 3,
}

export default class Operation {
  constructor(
    readonly type: OperationType,
    readonly text: string,
    readonly rangeText: string,
    readonly rangeStart: number,
    readonly rangeEnd: number,
  ) {

  }

  isValid(model?: Model) {
    if (this.rangeStart < 0) return false;
    if (this.rangeStart > this.rangeEnd) return false;
    if (this.rangeText.length !== this.rangeEnd - this.rangeStart) return false;

    if (model) {
      if (this.rangeEnd > model.getContent().length) return false;
      if (model.getContent().slice(this.rangeStart, this.rangeEnd) !== this.rangeText) return false;
    }

    switch (this.type) {
      case OperationType.Insert:
        if (this.rangeStart !== this.rangeEnd) return false;
        if (this.text.length === 0 || this.rangeText.length !== 0) return false;
        break;
      case OperationType.Update:
        if (this.rangeEnd === this.rangeStart) return false;
        if (this.text.length === 0 || this.rangeText.length === 0) return false;
        break;
      case OperationType.Delete:
        if (this.rangeEnd === this.rangeStart) return false;
        if (this.text.length !== 0 || this.rangeText.length === 0) return false;
        break;
      default:
        assertNever(this.type);
    }

    return true;
  }
}
