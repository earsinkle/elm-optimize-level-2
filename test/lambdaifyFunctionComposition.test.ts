import ts from 'typescript';

import { transformCode } from './helpers/transformCode';
import { lambdaifyFunctionComposition } from '../src/transforms/lambdaifyFunctionComposition';

test('it can replace << by an anonymous function', () => {
  // Corresponds to: f1 << f2
  const initialCode = `
  var fn = A2($elm$core$Basics$composeL, f1, f2);
  `;

  const expectedOutputCode = `
  var fn = function (_a_1) { return f1(f2(_a_1)) };
  `;

  const { actual, expected } = transformCode(
    initialCode,
    expectedOutputCode,
    lambdaifyFunctionComposition
  );

  expect(actual).toBe(expected);
});

test('it can replace >> by an anonymous function', () => {
  // Corresponds to: f1 >> f2
  const initialCode = `
  var fn = A2($elm$core$Basics$composeR, f1, f2);
  `;

  const expectedOutputCode = `
  var fn = function (_a_1) { return f2(f1(_a_1)) };
  `;

  const { actual, expected } = transformCode(
    initialCode,
    expectedOutputCode,
    lambdaifyFunctionComposition
  );

  expect(actual).toBe(expected);
});

test('it can replace nested function compositions with >>', () => {
  // Corresponds to: f1 >> f2 >> f3
  const initialCode = `
  var fn = A2($elm$core$Basics$composeR, f1, A2($elm$core$Basics$composeR, f2, f3));
  `;

  const expectedOutputCode = `
  var fn = function (_a_1) { return f3(f2(f1(_a_1))); };
  `;

  const { actual, expected } = transformCode(
    initialCode,
    expectedOutputCode,
    lambdaifyFunctionComposition
  );

  expect(actual).toBe(expected);
});

test('it can replace nested function compositions with <<', () => {
  // Corresponds to: f3 << f2 << f1
  const initialCode = `
  var fn = A2(
		$elm$core$Basics$composeL,
		A2($elm$core$Basics$composeL, f3, f2),
		f1);
  `;

  const expectedOutputCode = `
  var fn = function (_a_1) { return f3(f2(f1(_a_1))); };
  `;

  const { actual, expected } = transformCode(
    initialCode,
    expectedOutputCode,
    lambdaifyFunctionComposition
  );

  expect(actual).toBe(expected);
});

test("When multiple new variables are introduced, they don't share the same name", () => {
  // Corresponds to: f >> List.map (g >> h)
  const initialCode = `
  var fn = A2(
    $elm$core$Basics$composeR,
    f1,
    $elm$core$List$map(
      A2($elm$core$Basics$composeR, f2, f3)));
  `;

  // TODO Output for this could probably be improved
  const expectedOutputCode = `
  var fn = function (_a_1) { return $elm$core$List$map(function (_a_2) { return f3(f2(_a_2)); })(f1(_a_1)); };
  `;

  const { actual, expected } = transformCode(
    initialCode,
    expectedOutputCode,
    lambdaifyFunctionComposition
  );

  expect(actual).toBe(expected);
});
