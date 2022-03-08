import Operation from "../operation/Operation";
import EventEmitter from "../utils/EventEmitter";
import Changeset from "./Changeset";

export enum ApplyType {
  Redo = 'redo',
  Undo = 'undo',
  Edit = 'edit',
  Server = 'server',
}

export default class Model extends EventEmitter {
  constructor(private content: string) {
    super()
  }

  getContent() {
    return this.content;
  }

  applyChangesets(changesets: Changeset[], applyType: ApplyType) {
    changesets.forEach(changeset => this.applyChangeset(changeset, applyType, true));
    this.triggerEvent('update', { changesets, applyType });
  }

  applyChangeset(changeset: Changeset, applyType: ApplyType, isBatchApplying?: boolean) {
    changeset.operations.forEach(operation => this.applyOperation(operation, applyType, isBatchApplying));
    !isBatchApplying && this.triggerEvent('update', { changesets: [changeset], applyType });
  }

  applyOperations(operations: Operation[], applyType: ApplyType) {
    operations.forEach(operation => this.applyOperation(operation, applyType, true));
    this.triggerEvent('update', { changesets: [new Changeset(operations)], applyType });
  }

  applyOperation(operation: Operation, applyType?: ApplyType, isBatchApplying?: boolean) {
    if (!operation.isValid(this)) {
      throw new Error('operation is not valid to this model.');
    }

    const left = this.content.slice(0, operation.rangeStart);
    const right = this.content.slice(operation.rangeEnd);
    this.content = left + operation.text + right;

    !isBatchApplying && this.triggerEvent('update', {
      changesets: [new Changeset([operation])],
      applyType,
    });
  }
}
