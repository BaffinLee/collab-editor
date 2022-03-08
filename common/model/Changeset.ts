import Operation from '../operation/Operation';

export default class Changeset {
  constructor(
    readonly operations: Operation[],
    readonly userId?: number,
    readonly memberId?: number,
    readonly baseVersion?: number,
  ) {

  }
}
