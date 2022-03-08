import Changeset from '../model/Changeset';
import Model, { ApplyType } from '../model/Model';
import { getRandomChangesets, getRandomNum, getRandomOperations, getTestModel } from '../utils/random';
import { transformChangesets, transformOperations, TransformType } from './transform';

test('transformChangesets', () => {
  Array(10000).fill(0).forEach(() => {
    const modelA = getTestModel();
    const modelB = new Model(modelA.getContent());

    const changesetsA = getRandomChangesets(modelA, getRandomNum(1, 5), 1, 10);
    const changesetsB = getRandomChangesets(modelB, getRandomNum(1, 5), 1, 10);
    const [changesetsA1, changesetsB1] = transformChangesets(changesetsA, changesetsB, TransformType.Left);

    modelA.applyChangesets(changesetsA, ApplyType.Edit);
    modelA.applyChangesets(changesetsB1, ApplyType.Edit);

    modelB.applyChangesets(changesetsB, ApplyType.Edit);
    modelB.applyChangesets(changesetsA1, ApplyType.Edit);

    expect(modelA.getContent()).toBe(modelB.getContent());
  });
});

test('transformOperations', () => {
  Array(10000).fill(0).forEach(() => {
    const modelA = getTestModel();
    const modelB = new Model(modelA.getContent());

    const operationsA = getRandomOperations(modelA, 30);
    const operationsB = getRandomOperations(modelB, 30);
    const [operationsA1, operationsB1] = transformOperations(operationsA, operationsB, TransformType.Right);

    modelA.applyChangeset(new Changeset(operationsA, 0, 0), ApplyType.Edit);
    modelA.applyChangeset(new Changeset(operationsB1, 0, 0), ApplyType.Edit);

    modelB.applyChangeset(new Changeset(operationsB, 0, 0), ApplyType.Edit);
    modelB.applyChangeset(new Changeset(operationsA1, 0, 0), ApplyType.Edit);

    expect(modelA.getContent()).toEqual(modelB.getContent());
  });
});

test('TransformType', () => {
  Array(10000).fill(0).forEach(() => {
    const modelA = getTestModel();
    const modelB = new Model(modelA.getContent());

    const operationsA = getRandomOperations(modelA, 30);
    const operationsB = getRandomOperations(modelB, 30);
    const [operationsA1, operationsB1] = transformOperations(operationsA, operationsB, TransformType.Right);
    const [operationsB2, operationsA2] = transformOperations(operationsB, operationsA, TransformType.Left);

    expect(operationsA1).toEqual(operationsA2);
    expect(operationsB1).toEqual(operationsB2);
  });
});
