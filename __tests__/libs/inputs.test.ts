import { parseInputs } from "../../src/libs/inputs";
import { mockDefaultInputs } from "../../tests/helpers";
import { core } from "../../tests/mocks";

export const mockInputs = ({
  preRelease,
  releaseAs,
  releaseLabels,
  branches,
}: {
  preRelease?: string;
  releaseAs?: string;
  releaseLabels?: {
    ignore?: string;
    patch?: string;
    minor?: string;
    major?: string;
    ready?: string;
    done?: string;
  };
  branches?: {
    production?: string;
    release?: string;
  };
}) => {
  const { ignore, patch, minor, major, ready, done } = releaseLabels || {};
  core.getInput
    .mockReturnValueOnce(preRelease ?? "")
    .mockReturnValueOnce(releaseAs ?? "")
    .mockReturnValueOnce(ignore ?? "")
    .mockReturnValueOnce(patch ?? "")
    .mockReturnValueOnce(minor ?? "")
    .mockReturnValueOnce(major ?? "")
    .mockReturnValueOnce(ready ?? "")
    .mockReturnValueOnce(done ?? "")
    .mockReturnValueOnce(branches?.production ?? "")
    .mockReturnValueOnce(branches?.release ?? "");
};

describe("parseInputs()", () => {
  beforeEach(() => {
    mockDefaultInputs();
  });

  describe("when `preRelease`", () => {
    it("should return value when `alpha-01`", () => {
      mockInputs({ preRelease: "alpha-01" });

      const result = parseInputs();

      expect(result.preRelease).toEqual("alpha-01");
    });

    it("should return `undefined` when empty", () => {
      mockInputs({ preRelease: "" });

      const result = parseInputs();

      expect(result.preRelease).toEqual(undefined);
    });

    test.each(["te.st", "te_st", "te st", "test!"])(
      "should throw when `%s`",
      (value) => {
        mockInputs({ preRelease: value });

        expect(parseInputs).toThrow();
      },
    );
  });

  describe("when `releaseAs`", () => {
    it("should return value when `1.2.3-alpha.4`", () => {
      mockInputs({ releaseAs: "1.2.3-alpha.4" });

      const result = parseInputs();

      expect(result.releaseAs?.version).toEqual("1.2.3-alpha.4");
    });

    it("should return `undefined` when empty", () => {
      mockInputs({ releaseAs: "" });

      const result = parseInputs();

      expect(result.releaseAs).toEqual(undefined);
    });

    it("should throw when `test`", () => {
      mockInputs({ releaseAs: "test" });

      expect(parseInputs).toThrow();
    });
  });

  describe("when `releaseLabels`", () => {
    it("should return default values when empty", () => {
      mockInputs({
        releaseLabels: {
          ignore: "",
          patch: "",
          minor: "",
          major: "",
          ready: "",
          done: "",
        },
      });

      const result = parseInputs();

      expect(result.releaseLabels).toEqual({
        ignore: "changelog-ignore",
        patch: "type: fix",
        minor: "type: feature",
        major: "breaking",
        ready: "release: ready",
        done: "release: done",
      });
    });

    it("should return values when defined", () => {
      mockInputs({
        releaseLabels: {
          ignore: "ignore-label",
          patch: "patch-label",
          minor: "minor-label",
          major: "major-label",
          ready: "ready-label",
          done: "done-label",
        },
      });

      const result = parseInputs();

      expect(result.releaseLabels).toEqual({
        ignore: "ignore-label",
        patch: "patch-label",
        minor: "minor-label",
        major: "major-label",
        ready: "ready-label",
        done: "done-label",
      });
    });
  });

  describe("when `branches`", () => {
    it("should return default values when empty", () => {
      mockInputs({
        branches: {
          production: "",
          release: "",
        },
      });

      const result = parseInputs();

      expect(result.branches).toEqual({
        production: "main",
        release: "releases/next",
      });
    });

    it("should return values when defined", () => {
      mockInputs({
        branches: {
          production: "production",
          release: "release",
        },
      });

      const result = parseInputs();

      expect(result.branches).toEqual({
        production: "production",
        release: "release",
      });
    });
  });
});
