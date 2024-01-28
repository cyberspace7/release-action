import { parseInputs } from "../../src/libs/inputs";
import { mockDefaultInputs } from "../../tests/helpers";
import { core } from "../../tests/mocks";

export function mockInputs(inputs: {
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
}) {
  core.getInput
    .mockReturnValueOnce(inputs.preRelease ?? "")
    .mockReturnValueOnce(inputs.releaseAs ?? "")
    .mockReturnValueOnce(inputs.releaseLabels?.ignore ?? "")
    .mockReturnValueOnce(inputs.releaseLabels?.patch ?? "")
    .mockReturnValueOnce(inputs.releaseLabels?.minor ?? "")
    .mockReturnValueOnce(inputs.releaseLabels?.major ?? "")
    .mockReturnValueOnce(inputs.releaseLabels?.ready ?? "")
    .mockReturnValueOnce(inputs.releaseLabels?.done ?? "")
    .mockReturnValueOnce(inputs.branches?.production ?? "")
    .mockReturnValueOnce(inputs.branches?.release ?? "");
}

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

    it("should return `null` when empty", () => {
      mockInputs({ preRelease: "" });

      const result = parseInputs();

      expect(result.preRelease).toEqual(null);
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

    it("should return `null` when empty", () => {
      mockInputs({ releaseAs: "" });

      const result = parseInputs();

      expect(result.releaseAs).toEqual(null);
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
        ignore: ["ignore"],
        patch: ["patch", "fix"],
        minor: ["minor", "feature"],
        major: ["major", "breaking"],
        ready: "release: ready",
        done: "release: done",
      });
    });

    it("should return values when defined", () => {
      mockInputs({
        releaseLabels: {
          ignore: "\r\n",
          patch: "patch-label-1 \r\npatch-label-2",
          minor: "\r\nminor-label",
          major: "major-label\r\n",
          ready: "ready-label",
          done: " ",
        },
      });

      const result = parseInputs();

      expect(result.releaseLabels).toEqual({
        ignore: ["ignore"],
        patch: ["patch-label-1", "patch-label-2"],
        minor: ["minor-label"],
        major: ["major-label"],
        ready: "ready-label",
        done: "release: done",
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
