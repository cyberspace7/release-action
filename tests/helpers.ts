import { inputs } from "../src/libs/inputs";
import { githubResponseList, octokit } from "./mocks";

export const mockDefaultInputs = () => {
  inputs.preRelease = undefined;
  inputs.releaseAs = undefined;
  inputs.releaseLabels = {
    ignore: "changelog-ignore",
    patch: "type: fix",
    minor: "type: feature",
    major: "breaking",
    ready: "release: ready",
    done: "release: done",
  };
  inputs.branches = {
    production: "main",
    release: "releases/next",
  };
};

export const mockPullRequestLists = ({
  mergedRelease,
  openRelease,
  changes,
}: {
  mergedRelease?: unknown[];
  openRelease?: unknown[];
  changes?: unknown[];
}) => {
  if (mergedRelease) {
    octokit.rest.pulls.list.mockResolvedValueOnce({
      data: mergedRelease,
    });
  } else {
    octokit.rest.pulls.list.mockResolvedValueOnce(githubResponseList);
  }
  if (openRelease) {
    octokit.rest.pulls.list.mockResolvedValueOnce({
      data: openRelease,
    });
  } else {
    octokit.rest.pulls.list.mockResolvedValueOnce(githubResponseList);
  }
  if (changes) {
    octokit.rest.pulls.list.mockResolvedValueOnce({
      data: changes,
    });
  }
};
