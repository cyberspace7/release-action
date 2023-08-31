import { inputs } from "../src/libs/inputs";
import { main } from "../src/main";
import { mockPullRequestLists } from "../tests/helpers";
import { core, fileSystem, octokit } from "../tests/mocks";

const { readFileSync } = fileSystem;
const { setFailed, setOutput, error, warning, notice } = core;
const {
  rest: {
    git: { createTag },
    repos: { createRelease },
  },
} = octokit;

describe("main()", () => {
  beforeEach(() => {
    readFileSync.mockReturnValue(
      '{"name": "@owner/application", "version": "1.2.3-alpha.4"}',
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should release", async () => {
    readFileSync.mockReturnValueOnce(
      '{"name": "@owner/application", "version": "1.2.3"}',
    );
    mockPullRequestLists({
      mergedRelease: [
        {
          number: 3,
          state: "closed",
          merge_commit_sha: "sha",
          merged_at: "2020-01-01T00:00:00Z",
          labels: [{ name: inputs.releaseLabels.done }],
        },
        {
          number: 2,
          state: "closed",
          merge_commit_sha: "sha",
          labels: [{ name: inputs.releaseLabels.ready }],
        },
        {
          number: 1,
          state: "closed",
          merged_at: "2020-01-01T00:00:00Z",
          merge_commit_sha: "sha",
          labels: [{ name: inputs.releaseLabels.ready }],
        },
      ],
    });
    createTag.mockResolvedValue({
      data: {
        tag: "v1.2.3",
      },
    });
    createRelease.mockResolvedValueOnce({
      data: {
        name: "application v1.2.3",
        html_url: "https://url.com",
      },
    });

    await main();

    expect(setFailed).toHaveBeenCalledTimes(0);
    expect(error).toHaveBeenCalledTimes(0);
    expect(warning).toHaveBeenCalledTimes(0);
    expect(notice).toHaveBeenCalledTimes(2);
    expect(notice).toHaveBeenNthCalledWith(1, "Release tag v1.2.3 created.", {
      title: "Tag Created",
    });
    expect(notice).toHaveBeenNthCalledWith(
      2,
      "Release application v1.2.3 created.",
      {
        title: "Release Created",
      },
    );
    expect(setOutput).toHaveBeenCalledTimes(5);
    expect(setOutput).toHaveBeenNthCalledWith(1, "current-version", "1.2.3");
    expect(setOutput).toHaveBeenNthCalledWith(2, "pre-release", undefined);
    expect(setOutput).toHaveBeenNthCalledWith(3, "is-released", true);
    expect(setOutput).toHaveBeenNthCalledWith(4, "next-version", undefined);
    expect(setOutput).toHaveBeenNthCalledWith(5, "release-pr", undefined);
    expect(createTag).toHaveBeenCalledTimes(1);
    expect(createTag).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      tag: "v1.2.3",
      message: "Release v1.2.3",
      object: "sha",
      type: "commit",
    });
    expect(createRelease).toHaveBeenCalledTimes(1);
    expect(createRelease).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      tag_name: "v1.2.3",
      name: "application v1.2.3",
      generate_release_notes: true,
      prerelease: false,
    });
  });

  it("should release pre-release", async () => {
    readFileSync.mockReturnValueOnce(
      '{"name": "@owner/application", "version": "1.2.3-alpha.4"}',
    );
    mockPullRequestLists({
      mergedRelease: [
        {
          number: 1,
          state: "closed",
          merged_at: "2020-01-01T00:00:00Z",
          merge_commit_sha: "sha",
          labels: [{ name: inputs.releaseLabels.ready }],
        },
      ],
    });
    createTag.mockResolvedValue({
      data: {
        tag: "v1.2.3-alpha.4",
      },
    });
    createRelease.mockResolvedValueOnce({
      data: {
        name: "application v1.2.3-alpha.4",
        html_url: "https://url.com",
      },
    });

    await main();

    expect(setFailed).toHaveBeenCalledTimes(0);
    expect(error).toHaveBeenCalledTimes(0);
    expect(warning).toHaveBeenCalledTimes(0);
    expect(notice).toHaveBeenCalledTimes(2);
    expect(notice).toHaveBeenNthCalledWith(
      1,
      "Release tag v1.2.3-alpha.4 created.",
      {
        title: "Tag Created",
      },
    );
    expect(notice).toHaveBeenNthCalledWith(
      2,
      "Release application v1.2.3-alpha.4 created.",
      {
        title: "Release Created",
      },
    );
    expect(setOutput).toHaveBeenCalledTimes(5);
    expect(setOutput).toHaveBeenNthCalledWith(
      1,
      "current-version",
      "1.2.3-alpha.4",
    );
    expect(setOutput).toHaveBeenNthCalledWith(2, "pre-release", "alpha");
    expect(setOutput).toHaveBeenNthCalledWith(3, "is-released", true);
    expect(setOutput).toHaveBeenNthCalledWith(4, "next-version", undefined);
    expect(setOutput).toHaveBeenNthCalledWith(5, "release-pr", undefined);
    expect(createTag).toHaveBeenCalledTimes(1);
    expect(createTag).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      tag: "v1.2.3-alpha.4",
      message: "Release v1.2.3-alpha.4",
      object: "sha",
      type: "commit",
    });
    expect(createRelease).toHaveBeenCalledTimes(1);
    expect(createRelease).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      tag_name: "v1.2.3-alpha.4",
      name: "application v1.2.3-alpha.4",
      generate_release_notes: true,
      prerelease: true,
    });
  });

  it("should not release when no current version", async () => {
    readFileSync.mockReturnValueOnce('{"name": "@owner/application"}');

    await main();

    expect(setFailed).toHaveBeenCalledTimes(0);
    expect(error).toHaveBeenCalledTimes(0);
    expect(warning).toHaveBeenCalledTimes(0);
    expect(notice).toHaveBeenCalledTimes(1);
    expect(setOutput).toHaveBeenCalledTimes(5);
    expect(setOutput).toHaveBeenNthCalledWith(1, "current-version", undefined);
    expect(setOutput).toHaveBeenNthCalledWith(2, "pre-release", undefined);
    expect(setOutput).toHaveBeenNthCalledWith(3, "is-released", false);
    expect(setOutput).toHaveBeenNthCalledWith(4, "next-version", undefined);
    expect(setOutput).toHaveBeenNthCalledWith(5, "release-pr", undefined);
    expect(createTag).toHaveBeenCalledTimes(0);
    expect(createRelease).toHaveBeenCalledTimes(0);
  });

  it("should not release when no release pull request", async () => {
    await main();

    expect(setFailed).toHaveBeenCalledTimes(0);
    expect(error).toHaveBeenCalledTimes(0);
    expect(warning).toHaveBeenCalledTimes(0);
    expect(notice).toHaveBeenCalledTimes(2);
    expect(notice).toHaveBeenNthCalledWith(1, "No pull request to release.", {
      title: "No Release",
    });
    expect(setOutput).toHaveBeenCalledTimes(5);
    expect(setOutput).toHaveBeenNthCalledWith(
      1,
      "current-version",
      "1.2.3-alpha.4",
    );
    expect(setOutput).toHaveBeenNthCalledWith(2, "pre-release", "alpha");
    expect(setOutput).toHaveBeenNthCalledWith(3, "is-released", false);
    expect(setOutput).toHaveBeenNthCalledWith(4, "next-version", undefined);
    expect(setOutput).toHaveBeenNthCalledWith(5, "release-pr", undefined);
    expect(createTag).toHaveBeenCalledTimes(0);
    expect(createRelease).toHaveBeenCalledTimes(0);
  });
});
