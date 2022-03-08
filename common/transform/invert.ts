import Changeset from '../model/Changeset';
import Operation, { OperationType } from '../operation/Operation';
import { assertNever } from '../utils/type';

export function invertChangesets(changesets: Changeset[]) {
  return changesets.map(changeset => new Changeset(
    invertOperations(changeset.operations),
  )).reverse();
}

export function invertOperations(operations: Operation[]) {
  return operations.map(invertOperation).reverse();
}

export function invertOperation(operation: Operation) {
  switch (operation.type) {
    case OperationType.Insert:
      return new Operation(
        OperationType.Delete,
        '',
        operation.text,
        operation.rangeStart,
        operation.rangeStart + operation.text.length,
      );
    case OperationType.Update:
      return new Operation(
        OperationType.Update,
        operation.rangeText,
        operation.text,
        operation.rangeStart,
        operation.rangeEnd - (operation.rangeText.length - operation.text.length),
      );
    case OperationType.Delete:
      return new Operation(
        OperationType.Insert,
        operation.rangeText,
        '',
        operation.rangeStart,
        operation.rangeStart,
      );
    default:
      assertNever(operation.type);
  }
}
