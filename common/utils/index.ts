import Changeset from "../model/Changeset";
import Operation from "../operation/Operation";

export function getChangesetOperations(changesets: Changeset[]) {
  return changesets.reduce((ops, changeset) => {
    ops.push(...changeset.operations);
    return ops;
  }, [] as Operation[]);
}

export function checkChangesets(changesets: Changeset[], baseVersion?: number, targetVersion?: number) {
  if (baseVersion !== undefined && changesets[0]?.baseVersion !== baseVersion) {
    throw new Error('changesets baseVersion not match');
  }
  if (targetVersion !== undefined && changesets[changesets.length - 1]?.baseVersion !== targetVersion - 1) {
    throw new Error('changesets targetVersion not match');
  }
  return changesets.every((changeset, index) => {
    if (index === 0) return true;
    return changeset.baseVersion! === changesets[index - 1].baseVersion! + 1;
  });
}
