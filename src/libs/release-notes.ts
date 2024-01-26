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
