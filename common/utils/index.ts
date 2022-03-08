import Changeset from "../model/Changeset";
import Operation from "../operation/Operation";

export function getChangesetOperations(changesets: Changeset[]) {
  return changesets.reduce((ops, changeset) => {
    ops.push(...changeset.operations);
    return ops;
  }, [] as Operation[]);
}