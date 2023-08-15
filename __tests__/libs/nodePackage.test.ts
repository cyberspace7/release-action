import { getNodePackage } from "../../src/libs/nodePackage";
import { fileSystem } from "../../tests/mocks";

const { readFileSync } = fileSystem;

describe("getNodePackage()", () => {
  describe("when `name`", () => {
    it("should return value when `n-a_me1`", () => {
      readFileSync.mockReturnValueOnce(`{"name": "n-a_me1"}`);

      const result = getNodePackage();

      expect(result?.name).toEqual("n-a_me1");
    });

    it("should return value when `@o-w_ner2/n-a_me1`", () => {
      readFileSync.mockReturnValueOnce(`{"name": "@o-w_ner2/n-a_me1"}`);

      const result = getNodePackage();

      expect(result?.name).toEqual("n-a_me1");
    });

    test.each([
      "na|me",
      "name!",
      "na me",
      "owner/name",
      "@ow/ner/name",
      "@owner!/name",
      "ow ner/name",
    ])("should throw when `%s`", (value) => {
      readFileSync.mockReturnValueOnce(`{"name": "${value}`);

      expect(getNodePackage).toThrow();
    });
  });

  describe("when `version`", () => {
    it("should return value when `1.2.3-alpha.4`", () => {
      readFileSync.mockReturnValueOnce(
        '{"name": "name", "version": "1.2.3-alpha.4"}',
      );

      const result = getNodePackage();

      expect(result?.version?.version).toEqual("1.2.3-alpha.4");
    });

    it("should return `null` when empty", () => {
      readFileSync.mockReturnValueOnce('{"name": "name", "version": ""}');

      const result = getNodePackage();

      expect(result?.version).toEqual(null);
    });

    it("should throw when `test`", () => {
      readFileSync.mockReturnValueOnce('{"name": "name", "version": "test"}');

      expect(getNodePackage).toThrow();
    });
  });
});
