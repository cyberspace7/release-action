import { createReleasePullRequestBody } from "../../src/libs/release-notes";

describe("createReleasePullRequestBody()", () => {
  it("should return notes", () => {
    const notes = ["Line 1", "Line 2", "", "## Line 3", "", "Line 4"].join(
      "\n",
    );

    const result = createReleasePullRequestBody(notes);

    expect(result).toEqual("Line 1\nLine 2\n\n## Line 3\n\nLine 4");
  });

  it("should return notes when new contributors", () => {
    const notes = [
      "Ignored 1",
      "Ignored 2",
      "Line 1",
      "## Line 2",
      "",
      "## New Contributors",
      "",
      "Line 4",
    ].join("\n");

    const result = createReleasePullRequestBody(notes);

    expect(result).toEqual("Line 1\n## Line 2\n");
  });

  it("should return notes when full changelog", () => {
    const notes = [
      "Ignored 1",
      "Ignored 2",
      "Line 1",
      "## Line 2",
      "",
      "**Full Changelog**",
      "",
    ].join("\n");

    const result = createReleasePullRequestBody(notes);

    expect(result).toEqual("Line 1\n## Line 2\n");
  });
});
