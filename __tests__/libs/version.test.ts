import { SemVer } from "semver";
import type { PullRequest } from "../../src/libs/repository";
import { getVersionBumpLevel } from "../../src/libs/version";

describe("getVersionBumpLevel()", () => {
  const pullRequestCases = [
    [],
    [
      {
        labels: [{ name: "label" }],
      },
    ],
    [
      {
        labels: [{ name: "type: fix" }],
      },
      {
        labels: [{ name: "label" }],
      },
    ],
    [
      {
        labels: [{ name: "type: fix" }],
      },
      {
        labels: [
          { name: "type: feature" },
          { name: "breaking" },
          { name: "changelog-ignore" },
        ],
      },
      {
        labels: [{ name: "type: feature" }],
      },
      {
        labels: [{ name: "label" }],
      },
    ],
    [
      {
        labels: [{ name: "type: fix" }],
      },
      {
        labels: [{ name: "type: feature" }, { name: "breaking" }],
      },
      {
        labels: [{ name: "label" }],
      },
    ],
  ];
  const cases = [
    ["1.0.0", 0, 0],
    ["1.0.0", 1, 0],
    ["1.0.0", 2, 1],
    ["1.0.0", 3, 2],
    ["1.0.0", 4, 3],
    ["0.10.0", 0, 0],
    ["0.10.0", 1, 0],
    ["0.10.0", 2, 1],
    ["0.10.0", 3, 2],
    ["0.10.0", 4, 2],
    ["", 0, 0],
    ["", 1, 0],
    ["", 2, 1],
    ["", 3, 2],
    ["", 4, 2],
  ];
  test.each(cases)(
    "for `%s`, case `%i`, should return `%i`",
    (version, caseIndex, expected) => {
      const result = getVersionBumpLevel(
        pullRequestCases.at(caseIndex as number) as PullRequest[],
        version ? new SemVer(version as string) : null,
      );

      expect(result).toEqual(expected);
    },
  );
});
