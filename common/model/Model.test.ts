import { invertChangesets, invertOperations } from '../transform/invert';
import { getRandomChangesets, getRandomNum, getRandomOperations, getTestModel } from '../utils/random';
import { ApplyType } from './Model';

test('applyChangesets', () => {
  const model = getTestModel();
  const content = model.getContent();

  const handleUpdate = jest.fn();
  model.addEventListener('update', handleUpdate);

  Array(10000).fill(0).map(() => {
    const changesets = getRandomChangesets(model, 3, 1, 5);
    model.applyChangesets(changesets, ApplyType.Edit);
    model.applyChangesets(invertChangesets(changesets), ApplyType.Edit);
    expect(model.getContent()).toEqual(content);

    const operations = getRandomOperations(model, getRandomNum(1, 10));
    model.applyOperations(operations, ApplyType.Edit);
    model.applyOperations(invertOperations(operations), ApplyType.Edit);
    expect(model.getContent()).toEqual(content);
  });

  model.removeEventListener('update', handleUpdate);
  expect(handleUpdate).toBeCalled();
});
