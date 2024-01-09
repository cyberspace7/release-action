import { inputs } from "../src/libs/inputs";
import { main } from "../src/main";
import { mockPullRequestLists } from "../tests/helpers";
import { core, fileSystem, octokit } from "../tests/mocks";

describe("main()", () => {
  beforeEach(() => {
    fileSystem.readFileSync.mockReturnValue(
      '{"name": "@owner/application", "version": "1.2.3-alpha.4"}',
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should release", async () => {
    fileSystem.readFileSync.mockReturnValueOnce(
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
    octokit.rest.git.createTag.mockResolvedValue({
      data: {
        tag: "v1.2.3",
      },
    });
    octokit.rest.repos.createRelease.mockResolvedValueOnce({
      data: {
        name: "application v1.2.3",
        html_url: "https://url.com",
      },
    });

    await main();

    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.warning).toHaveBeenCalledTimes(0);
    expect(core.notice).toHaveBeenCalledTimes(2);
    expect(core.notice).toHaveBeenNthCalledWith(
      1,
      "Release tag v1.2.3 created.",
      {
        title: "Tag Created",
      },
    );
    expect(core.notice).toHaveBeenNthCalledWith(
      2,
      "Release application v1.2.3 created.",
      {
        title: "Release Created",
      },
    );
    expect(core.setOutput).toHaveBeenCalledTimes(5);
    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      "current-version",
      "1.2.3",
    );
    expect(core.setOutput).toHaveBeenNthCalledWith(2, "pre-release", null);
    expect(core.setOutput).toHaveBeenNthCalledWith(3, "is-released", true);
    expect(core.setOutput).toHaveBeenNthCalledWith(4, "next-version", null);
    expect(core.setOutput).toHaveBeenNthCalledWith(5, "release-pr", null);
    expect(octokit.rest.git.createTag).toHaveBeenCalledTimes(1);
    expect(octokit.rest.git.createTag).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      tag: "v1.2.3",
      message: "Release v1.2.3",
      object: "sha",
      type: "commit",
    });
    expect(octokit.rest.repos.createRelease).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.createRelease).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      tag_name: "v1.2.3",
      name: "application v1.2.3",
      generate_release_notes: true,
      prerelease: false,
    });
  });

  it("should release pre-release", async () => {
    fileSystem.readFileSync.mockReturnValueOnce(
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
    octokit.rest.git.createTag.mockResolvedValue({
      data: {
        tag: "v1.2.3-alpha.4",
      },
    });
    octokit.rest.repos.createRelease.mockResolvedValueOnce({
      data: {
        name: "application v1.2.3-alpha.4",
        html_url: "https://url.com",
      },
    });

    await main();

    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.warning).toHaveBeenCalledTimes(0);
    expect(core.notice).toHaveBeenCalledTimes(2);
    expect(core.notice).toHaveBeenNthCalledWith(
      1,
      "Release tag v1.2.3-alpha.4 created.",
      {
        title: "Tag Created",
      },
    );
    expect(core.notice).toHaveBeenNthCalledWith(
      2,
      "Release application v1.2.3-alpha.4 created.",
      {
        title: "Release Created",
      },
    );
    expect(core.setOutput).toHaveBeenCalledTimes(5);
    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      "current-version",
      "1.2.3-alpha.4",
    );
    expect(core.setOutput).toHaveBeenNthCalledWith(2, "pre-release", "alpha");
    expect(core.setOutput).toHaveBeenNthCalledWith(3, "is-released", true);
    expect(core.setOutput).toHaveBeenNthCalledWith(4, "next-version", null);
    expect(core.setOutput).toHaveBeenNthCalledWith(5, "release-pr", null);
    expect(octokit.rest.git.createTag).toHaveBeenCalledTimes(1);
    expect(octokit.rest.git.createTag).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      tag: "v1.2.3-alpha.4",
      message: "Release v1.2.3-alpha.4",
      object: "sha",
      type: "commit",
    });
    expect(octokit.rest.repos.createRelease).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.createRelease).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      tag_name: "v1.2.3-alpha.4",
      name: "application v1.2.3-alpha.4",
      generate_release_notes: true,
      prerelease: true,
    });
  });

  it("should not release when no current version", async () => {
    fileSystem.readFileSync.mockReturnValueOnce(
      '{"name": "@owner/application"}',
    );

    await main();

    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.warning).toHaveBeenCalledTimes(0);
    expect(core.notice).toHaveBeenCalledTimes(1);
    expect(core.setOutput).toHaveBeenCalledTimes(5);
    expect(core.setOutput).toHaveBeenNthCalledWith(1, "current-version", null);
    expect(core.setOutput).toHaveBeenNthCalledWith(2, "pre-release", null);
    expect(core.setOutput).toHaveBeenNthCalledWith(3, "is-released", false);
    expect(core.setOutput).toHaveBeenNthCalledWith(4, "next-version", null);
    expect(core.setOutput).toHaveBeenNthCalledWith(5, "release-pr", null);
    expect(octokit.rest.git.createTag).toHaveBeenCalledTimes(0);
    expect(octokit.rest.repos.createRelease).toHaveBeenCalledTimes(0);
  });

  it("should not release when no release pull request", async () => {
    await main();

    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.warning).toHaveBeenCalledTimes(0);
    expect(core.notice).toHaveBeenCalledTimes(2);
    expect(core.notice).toHaveBeenNthCalledWith(
      1,
      "No pull request to release.",
      {
        title: "No Release",
      },
    );
    expect(core.setOutput).toHaveBeenCalledTimes(5);
    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      "current-version",
      "1.2.3-alpha.4",
    );
    expect(core.setOutput).toHaveBeenNthCalledWith(2, "pre-release", "alpha");
    expect(core.setOutput).toHaveBeenNthCalledWith(3, "is-released", false);
    expect(core.setOutput).toHaveBeenNthCalledWith(4, "next-version", null);
    expect(core.setOutput).toHaveBeenNthCalledWith(5, "release-pr", null);
    expect(octokit.rest.git.createTag).toHaveBeenCalledTimes(0);
    expect(octokit.rest.repos.createRelease).toHaveBeenCalledTimes(0);
  });
});
