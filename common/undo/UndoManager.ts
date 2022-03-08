import Changeset from "../model/Changeset";
import { ApplyType } from "../model/Model";
import Operation from "../operation/Operation";
import { invertOperations } from "../transform/invert";
import { transformOperations, TransformType } from "../transform/transform";
import EventEmitter from "../utils/EventEmitter";
import { addEventListener, removeEventListener } from "../utils/undo-event";

export default class UndoManager extends EventEmitter {
  private undoStack: Operation[][] = [];
  private redoStack: Operation[][] = [];

  constructor() {
    super();
    addEventListener('undo', this.undo);
    addEventListener('redo', this.redo);
  }

  destroy() {
    removeEventListener('undo', this.undo);
    removeEventListener('redo', this.redo);
  }

  pushChangesets(changesets: Changeset[]) {
    this.redoStack = [];
    this.undoStack.unshift(invertOperations(this.getOperations(changesets)));
    this.triggerEvent('stackChange');
  }

  undo = () => {
    if (!this.undoStack.length) {
      return;
    }
    const operations = this.undoStack.shift()!;
    this.redoStack.unshift(invertOperations(operations));
    this.triggerEvent('stackChange');
    this.triggerEvent('applyChange', { operations, type: ApplyType.Undo });
  }

  redo = () => {
    if (!this.redoStack.length) {
      return;
    }
    const operations = this.redoStack.shift()!;
    this.undoStack.unshift(invertOperations(operations));
    this.triggerEvent('stackChange');
    this.triggerEvent('applyChange', { operations, type: ApplyType.Redo });
  }

  transformChangesets(changesets: Changeset[]) {
    const serverOperations = this.getOperations(changesets);
    this.undoStack = this.undoStack
      .map(ops => transformOperations(ops, serverOperations, TransformType.Right)[0])
      .filter(ops => !!ops.length);
    this.redoStack = this.redoStack
      .map(ops => transformOperations(ops, serverOperations, TransformType.Right)[0])
      .filter(ops => !!ops.length);
    this.triggerEvent('stackChange');
  }

  getUndoStackLength() {
    return this.undoStack.length;
  }

  getRedoStackLength() {
    return this.redoStack.length;
  }

  private getOperations(changesets: Changeset[]) {
    return changesets.reduce((ops, changeset) => {
      ops.push(...changeset.operations);
      return ops;
    }, [] as Operation[]);
  }
}
