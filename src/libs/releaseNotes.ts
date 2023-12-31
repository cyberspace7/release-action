import { diffLines } from "diff";

export function createReleasePullRequestBody(releaseNotes: string) {
  const lines = releaseNotes.split("\n");
  const endIndex = lines.findIndex(
    (line) =>
      line.startsWith("## New Contributors") ||
      line.startsWith("**Full Changelog**"),
  );
  const selectedLines = endIndex > 0 ? lines.splice(2, endIndex - 2) : lines;
  return selectedLines.join("\n");
}

export function getDiffMarkdown(oldContent: string, newContent: string) {
  const diff = diffLines(oldContent.trim() + "\n", newContent.trim() + "\n");
  const markdownDiff = diff
    .map(({ added, removed, value }) => {
      const printedValue = value.replace(/\n$/, "");
      if (removed) {
        return printedValue
          .split("\n")
          .map((line) => `-  ${line}`)
          .join("\n");
      }
      if (added) {
        return printedValue
          .split("\n")
          .map((line) => `+  ${line}`)
          .join("\n");
      }

      return null;
    })
    .filter((value) => !!value)
    .join("\n");

  return markdownDiff.length ? `\`\`\`diff\n${markdownDiff}\n\`\`\`` : null;
}
