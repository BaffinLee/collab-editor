import Changeset from "../model/Changeset";
import Operation from "../operation/Operation";

export function assertNever(value: never): never {
  throw new Error('unknown type: ' + value);
}

export function convertOperations(operations: Operation[]) {
  return operations.map((op: Operation) => new Operation(
    op.type,
    op.text,
    op.rangeText,
    op.rangeStart,
    op.rangeEnd,
  ));
}

export function convertChangesets(changesets: Changeset[]) {
  return changesets.map(changeset => {
    return new Changeset(
      convertOperations(changeset.operations),
      changeset.userId,
      changeset.memberId,
      changeset.baseVersion,
    );
  });
}
