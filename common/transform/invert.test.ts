import { getRandomOperations, getTestModel } from '../utils/random';
import { invertOperations } from './invert';

test('invertOperations', () => {
  const model = getTestModel();
  Array(10000).fill(0).map(() => {
    const operations = getRandomOperations(model, 3);
    const operationsInverted = invertOperations(operations);
    operationsInverted.forEach(operation => expect(operation.isValid()).toBe(true));
    expect(invertOperations(operationsInverted)).toEqual(operations);
  });
});
