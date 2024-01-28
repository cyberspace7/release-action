import { inputs } from "../src/libs/inputs";
import { githubResponseList, octokit } from "./mocks";

export function mockDefaultInputs() {
  inputs.preRelease = null;
  inputs.releaseAs = null;
  inputs.releaseLabels = {
    ignore: ["ignore"],
    patch: ["type: fix", "type: performance"],
    minor: ["type: feature"],
    major: ["major", "breaking"],
    ready: "release: ready",
    done: "release: done",
  };
  inputs.branches = {
    production: "main",
    release: "releases/next",
  };
}

export function mockPullRequestLists(pullRequests: {
  mergedRelease?: unknown[];
  openRelease?: unknown[];
  changes?: unknown[];
}) {
  if (pullRequests.mergedRelease) {
    octokit.rest.pulls.list.mockResolvedValueOnce({
      data: pullRequests.mergedRelease,
    });
  } else {
    octokit.rest.pulls.list.mockResolvedValueOnce(githubResponseList);
  }
  if (pullRequests.openRelease) {
    octokit.rest.pulls.list.mockResolvedValueOnce({
      data: pullRequests.openRelease,
    });
  } else {
    octokit.rest.pulls.list.mockResolvedValueOnce(githubResponseList);
  }
  if (pullRequests.changes) {
    octokit.rest.pulls.list.mockResolvedValueOnce({
      data: pullRequests.changes,
    });
  }
}
