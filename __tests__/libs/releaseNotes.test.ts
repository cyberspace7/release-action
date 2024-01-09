import {
  createReleasePullRequestBody,
  getDiffMarkdown,
} from "../../src/libs/releaseNotes";

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

describe("getDiffMarkdown()", () => {
  it("should return diff when adds", () => {
    const oldContent = ["Line 1", "Line 2"].join("\n");
    const newContent = ["Line 1", "Line 2", "Line 3"].join("\n");

    const result = getDiffMarkdown(oldContent, newContent);

    expect(result).toEqual("```diff\n+  Line 3\n```");
  });

  it("should return diff when changes", () => {
    const oldContent = ["Line 1", "Line 2", "", "Line 3"].join("\n");
    const newContent = ["Line 1", "Line 1a", "", "Line 3"].join("\n");

    const result = getDiffMarkdown(oldContent, newContent);

    expect(result).toEqual("```diff\n-  Line 2\n+  Line 1a\n```");
  });

  it("should return `null` when no changes", () => {
    const oldContent = ["Line 1", "Line 2", "", "Line 3"].join("\n");
    const newContent = ["Line 1", "Line 2", "", "Line 3"].join("\n");

    const result = getDiffMarkdown(oldContent, newContent);

    expect(result).toEqual(null);
  });

  it("should return `null` when empty", () => {
    const oldContent = "";
    const newContent = " ";

    const result = getDiffMarkdown(oldContent, newContent);

    expect(result).toEqual(null);
  });
});
