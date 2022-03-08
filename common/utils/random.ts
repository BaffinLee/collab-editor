import Changeset from '../model/Changeset';
import Model, { ApplyType } from '../model/Model';
import Operation, { OperationType } from '../operation/Operation';
import { DEFAULT_CODE } from './text';
import { assertNever } from './type';

export function getRandomNum(min: number, max: number) {
  return min + Math.floor((max - min) * Math.random());
}

export function getTestModel() {
  return new Model(DEFAULT_CODE);
}

export function getRandomOperation(model: Model) {
  const operationTypes = [OperationType.Insert, OperationType.Update, OperationType.Delete];
  const modelContent = model.getContent();
  const textLength = modelContent.length;

  let operationType = operationTypes[getRandomNum(0, operationTypes.length)];
  if (textLength === 0) {
    operationType = OperationType.Insert;
  }

  let rangeStart = getRandomNum(0, textLength + 1);
  let rangeEnd = getRandomNum(0, textLength + 1);
  if (rangeStart > rangeEnd) {
    [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
  }
  if (operationType === OperationType.Insert) {
    rangeEnd = rangeStart;
  } else if (rangeStart === rangeEnd) {
    if (rangeStart === 0) {
      rangeEnd += 1;
    } else {
      rangeStart -= 1;
    }
  }

  const randomStart = getRandomNum(0, textLength);
  const randomEnd = Math.min(randomStart + getRandomNum(1, 10), textLength);
  let randomText = modelContent.slice(randomStart, randomEnd);
  const rangeText = modelContent.slice(rangeStart, rangeEnd);

  if (randomText === '') {
    randomText = 'a';
  }

  switch (operationType) {
    case OperationType.Insert:
      return new Operation(
        operationType,
        randomText,
        '',
        rangeStart,
        rangeStart,
      );
    case OperationType.Update:
      return new Operation(
        operationType,
        randomText,
        rangeText,
        rangeStart,
        rangeEnd,
      );
    case OperationType.Delete:
      return new Operation(
        operationType,
        '',
        rangeText,
        rangeStart,
        rangeEnd,
      );
    default:
      assertNever(operationType);
  }
}

export function getRandomOperations(model: Model, operationNum: number) {
  const modelCopy = new Model(model.getContent());
  const operations: Operation[] = [];
  Array(operationNum).fill(0).forEach(() => {
    const operation = getRandomOperation(modelCopy);
    modelCopy.applyChangeset(new Changeset(
      [operation],
    ), ApplyType.Edit);
    operations.push(operation);
  });
  return operations;
}

export function getRandomChangeset(model: Model, operationNum: number) {
  return new Changeset(
    getRandomOperations(model, operationNum),
  );
}

export function getRandomChangesets(model: Model, changesetNum: number, opNumMin: number, opNumMax?: number) {
  const modelCopy = new Model(model.getContent());
  const changesets: Changeset[] = [];
  Array(changesetNum).fill(0).forEach(() => {
    const changeset = getRandomChangeset(modelCopy, getRandomNum(opNumMin, opNumMax || opNumMin));
    modelCopy.applyChangeset(changeset, ApplyType.Edit);
    changesets.push(changeset);
  });
  return changesets;
}
