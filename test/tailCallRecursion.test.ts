import ts from 'typescript';

import { createTailCallRecursionTransformer } from '../src/transforms/tailCallRecursion';

test("it doesn't affect functions that are not recursive", () => {
  const initialCode = `
  var $elm$core$Basics$identity = function (x) {
	return x;
  };
  `;

  const { actual, expected } = transformCode(
    initialCode,
    initialCode,
    createTailCallRecursionTransformer
  );

  expect(actual).toBe(expected);
});

test("it doesn't affect functions that are not tail-call recursive", () => {
  const initialCode = `
  var factorial = function (n) {
	return mult(n, factorial(n - 1));
  };
  `;

  const { actual, expected } = transformCode(
    initialCode,
    initialCode,
    createTailCallRecursionTransformer
  );

  expect(actual).toBe(expected);
});

test('it can turn a function that is tail-call recursive into a while loop', () => {
  // Corresponds to the following Elm code
  // recursiveFunction : (a -> b) -> List a -> List b -> List b
  // recursiveFunction mapper list acc =
  //     case list of
  //         [] ->
  //             acc
  //         x :: xs ->
  //             recursiveFunction mapper xs <| (mapper x :: acc)
  const initialCode = `
  var something$recursiveFunction = F3(
	function (mapper, list, acc) {
		if (!list.b) {
			return acc;
		} else {
			var x = list.a;
			var xs = list.b;
			return A3(
				something$recursiveFunction,
				mapper,
				xs,
				A2(
					$elm$core$List$cons,
					mapper(x),
					acc));
		}
	});
  `;

  // Corresponds to the following TCO-ed Elm code
  // recursiveFunction : (a -> b) -> List a -> List b -> List b
  // recursiveFunction mapper list acc =
  //     case list of
  //         [] ->
  //             acc
  //         x :: xs ->
  //             recursiveFunction mapper xs (mapper x :: acc)
  const expectedOutputCode = `
  var something$recursiveFunction = F3(
	function (mapper, list, acc) {
		recursiveFunction:
		while (true) {
			if (!list.b) {
				return acc;
			} else {
				var x = list.a;
				var xs = list.b;
				var $temp$mapper = mapper,
					$temp$list = xs,
					$temp$acc = A2(
					$elm$core$List$cons,
					mapper(x),
					acc);
				mapper = $temp$mapper;
				list = $temp$list;
				acc = $temp$acc;
				continue recursiveFunction;
			}
		}
	});
  `;

  const { actual, expected } = transformCode(
    initialCode,
    expectedOutputCode,
    createTailCallRecursionTransformer
  );

  expect(actual).toBe(expected);
});

export function transformCode(
  initialCode: string,
  expectedCode: string,
  transformer: ts.TransformerFactory<ts.SourceFile>
): {
  actual: string;
  expected: string;
} {
  const source = ts.createSourceFile(
    'elm.js',
    initialCode,
    ts.ScriptTarget.ES2018
  );

  const printer = ts.createPrinter();

  const [output] = ts.transform(source, [transformer]).transformed;

  const expectedOutput = printer.printFile(
    ts.createSourceFile('elm.js', expectedCode, ts.ScriptTarget.ES2018)
  );

  const printedOutput = printer.printFile(output);

  return {
    actual: printedOutput,
    expected: expectedOutput,
  };
}
