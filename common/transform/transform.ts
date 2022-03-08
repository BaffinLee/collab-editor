import Changeset from '../model/Changeset';
import Operation, { OperationType } from '../operation/Operation';
import { assertNever } from '../utils/type';

export enum TransformType {
  Left = 'left',
  Right = 'right',
}

export function transformChangesets(
  changesets1: Changeset[],
  changesets2: Changeset[],
  transformType: TransformType,
) {
  let operations1 = changesets1.reduce((operations, changeset) => {
    operations.push(...changeset.operations);
    return operations;
  }, [] as Operation[]);
  let operations2 = changesets2.reduce((operations, changeset) => {
    operations.push(...changeset.operations);
    return operations;
  }, [] as Operation[]);

  [operations1, operations2] = transformOperations(operations1, operations2, transformType, false);

  return [
    changesets1.map(changeset => new Changeset(
      operations1.splice(0, changeset.operations.length).filter(op => !!op),
    )).filter(changeset => changeset.operations.length !== 0),
    changesets2.map(changeset => new Changeset(
      operations2.splice(0, changeset.operations.length).filter(op => !!op),
    )).filter(changeset => changeset.operations.length !== 0),
  ];
}

export function transformOperations(
  operations1: Operation[],
  operations2: Operation[],
  transformType: TransformType,
  filterNull: boolean = true,
) {
  operations1 = [...operations1];
  operations2 = [...operations2];
  operations1.forEach((_, i) => {
    operations2.forEach((_, j) => {
      const op1 = operations1[i];
      const op2 = operations2[j];
      if (!op1 || !op2) return;
      operations1[i] = transformOperation(op1, op2, transformType)!;
      operations2[j] = transformOperation(op2, op1, transformType === TransformType.Right ? TransformType.Left : TransformType.Right)!;
    });
  });
  return [
    filterNull ? operations1.filter(op => !!op) : operations1,
    filterNull ? operations2.filter(op => !!op) : operations2,
  ];
}

export function transformOperation(
  operation1: Operation,
  operation2: Operation,
  transformType: TransformType,
) {
  switch (operation1.type) {
    case OperationType.Insert:
      return transformInsertOperation(operation1, operation2, transformType);
    case OperationType.Update:
      return transformUpdateOperation(operation1, operation2, transformType);
    case OperationType.Delete:
      return transformDeleteOperation(operation1, operation2, transformType);
    default:
      assertNever(operation1.type);
  }
}

export function transformCursor(
  operations: Operation[],
  offset: number,
) {
  operations.forEach(operation => {
    switch (operation.type) {
      case OperationType.Insert:
        if (operation.rangeStart <= offset) {
          offset += operation.text.length;
        }
      case OperationType.Delete:
      case OperationType.Update:
        const diffTextLength = operation.rangeEnd - operation.rangeStart - operation.text.length;
        if (offset >= operation.rangeEnd) {
          offset -= diffTextLength;
        } else if (offset < operation.rangeStart) {
          offset = operation.rangeStart;
        }
        break;
      default:
        assertNever(operation.type);
    }
  });
  return offset;
}

function transformInsertOperation(
  operation1: Operation,
  operation2: Operation,
  transformType: TransformType,
) {
  switch (operation2.type) {
    case OperationType.Insert:
      if (operation1.rangeStart === operation2.rangeStart) {
        // offset1 === offset2, keep both
        if (transformType === TransformType.Right) {
          return new Operation(
            OperationType.Insert,
            operation1.text,
            operation1.rangeText,
            operation1.rangeStart + operation2.text.length,
            operation1.rangeEnd + operation2.text.length,
          );
        } else {
          return operation1;
        }
      } else {
        if (operation1.rangeStart > operation2.rangeStart) {
          // offset1 > offset2
          return new Operation(
            OperationType.Insert,
            operation1.text,
            operation1.rangeText,
            operation1.rangeStart + operation2.text.length,
            operation1.rangeEnd + operation2.text.length,
          );
        } else {
          // offset1 < offset2
          return operation1;
        }
      }
    case OperationType.Update:
    case OperationType.Delete:
      if (operation1.rangeStart <= operation2.rangeStart) {
        // offset1 < range2
        return operation1;
      } else if (operation1.rangeStart >= operation2.rangeEnd) {
        // offset1 > range2
        const diffTextLength = operation2.rangeEnd - operation2.rangeStart - operation2.text.length;
        return new Operation(
          OperationType.Insert,
          operation1.text,
          operation1.rangeText,
          operation1.rangeStart - diffTextLength,
          operation1.rangeEnd - diffTextLength,
        );
      } else {
        // offset1 in range2
        return null;
      }
    default:
      assertNever(operation2.type);
  }
}

function transformUpdateOperation(
  operation1: Operation,
  operation2: Operation,
  transformType: TransformType,
) {
  switch (operation2.type) {
    case OperationType.Insert:
      if (operation2.rangeStart < operation1.rangeEnd) {
        // offset2 before range2 end
        return new Operation(
          operation1.type,
          operation1.text,
          operation2.rangeStart <= operation1.rangeStart
            ? operation1.rangeText
            : (operation1.rangeText.slice(0, operation2.rangeStart - operation1.rangeStart) +
                operation2.text +
                operation1.rangeText.slice(operation2.rangeStart - operation1.rangeStart)
              ),
          operation2.rangeStart <= operation1.rangeStart
            ? operation1.rangeStart + operation2.text.length
            : operation1.rangeStart,
          operation1.rangeEnd + operation2.text.length,
        );
      } else {
        return operation1;
      }
    case OperationType.Update:
    case OperationType.Delete:
      // range1 === range2
      if (operation1.rangeStart === operation2.rangeStart && operation1.rangeEnd === operation2.rangeEnd) {
        // delete vs delete
        if (operation1.type === OperationType.Delete && operation2.type === OperationType.Delete) {
          return null;
        }
        // delete vs update, keep update
        if (operation1.type !== operation2.type) {
          return operation1.type === OperationType.Update
            ? new Operation(
                OperationType.Insert,
                operation1.text,
                '',
                operation1.rangeStart,
                operation1.rangeStart,
              )
            : null;
        }
        // update vs update
        if (transformType === TransformType.Right) {
          return new Operation(
            operation1.type,
            operation1.text,
            operation2.text,
            operation2.rangeStart,
            operation2.rangeStart + operation2.text.length,
          );
        } else {
          return null;
        }
      }
      // range2 contains range1
      if (operation1.rangeStart >= operation2.rangeStart && operation1.rangeEnd <= operation2.rangeEnd) {
        return null;
      }
      // range1 contains range2
      if (operation1.rangeStart <= operation2.rangeStart && operation1.rangeEnd >= operation2.rangeEnd) {
        const diffTextLength = operation2.rangeEnd - operation2.rangeStart - operation2.text.length;
        return new Operation(
          operation1.type,
          operation1.text,
          operation1.rangeText.slice(0, operation2.rangeStart - operation1.rangeStart) +
            operation2.text +
            operation1.rangeText.slice(operation2.rangeEnd - operation1.rangeStart),
          operation1.rangeStart,
          operation1.rangeEnd - diffTextLength,
        );
      }
      if (operation1.rangeStart < operation2.rangeStart) {
        // |range1|
        //     |range2|
        return new Operation(
          operation1.type,
          operation1.text,
          operation2.rangeStart < operation1.rangeEnd
            ? operation1.rangeText.slice(0, operation2.rangeStart - operation1.rangeStart)
            : operation1.rangeText,
          operation1.rangeStart,
          Math.min(operation1.rangeEnd, operation2.rangeStart),
        );
      } else {
        // |range2|
        //     |range1|
        const diffTextLength = operation2.rangeEnd - operation2.rangeStart - operation2.text.length;
        return new Operation(
          operation1.type,
          operation1.text,
          operation2.rangeEnd > operation1.rangeStart
            ? operation1.rangeText.slice(operation2.rangeEnd - operation1.rangeStart)
            : operation1.rangeText,
          Math.max(operation1.rangeStart, operation2.rangeEnd) - diffTextLength,
          operation1.rangeEnd - diffTextLength,
        );
      }
    default:
      assertNever(operation2.type);
  }
}

function transformDeleteOperation(
  operation1: Operation,
  operation2: Operation,
  transformType: TransformType,
) {
  return transformUpdateOperation(operation1, operation2, transformType);
}
