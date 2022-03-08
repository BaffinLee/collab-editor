import { getRandomOperation, getTestModel } from "./random";

test('getRandomOperation', () => {
  const model = getTestModel();
  Array(10000).fill(0).forEach(() => {
    expect(getRandomOperation(model).isValid(model)).toBe(true);
  });
});
