import { getPreRelease, getReleaseAs } from "../../src/libs/inputs";
import { core } from "../../tests/mocks";

const { getInput } = core;

describe("getPreRelease()", () => {
  it("should return value when `alpha-01`", () => {
    getInput.mockReturnValueOnce("alpha-01");

    const result = getPreRelease();

    expect(result).toEqual("alpha-01");
  });

  it("should return `undefined` when empty", () => {
    getInput.mockReturnValueOnce("");

    const result = getPreRelease();

    expect(result).toEqual(undefined);
  });

  test.each(["te.st", "te_st", "te st", "test!"])(
    "should throw when `%s`",
    (value) => {
      getInput.mockReturnValueOnce(value);

      expect(getPreRelease).toThrow();
    },
  );
});

describe("getReleaseAs()", () => {
  it("should return value when `1.2.3-alpha.4`", () => {
    getInput.mockReturnValueOnce("1.2.3-alpha.4");

    const result = getReleaseAs();

    expect(result?.version).toEqual("1.2.3-alpha.4");
  });

  it("should return `undefined` when empty", () => {
    getInput.mockReturnValueOnce("");

    const result = getReleaseAs();

    expect(result).toEqual(undefined);
  });

  it("should throw when `test`", () => {
    getInput.mockReturnValueOnce("test");

    expect(getReleaseAs).toThrow();
  });
});
