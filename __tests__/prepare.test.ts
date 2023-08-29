import { SemVer } from "semver";
import { inputs } from "../src/libs/inputs";
import { main } from "../src/main";
import { mockPullRequestLists } from "../tests/helpers";
import { core, fileSystem, octokit } from "../tests/mocks";

const { readFileSync } = fileSystem;
const { setFailed, setOutput, error, warning, notice } = core;
const {
  rest: {
    repos: {
      getContent,
      generateReleaseNotes,
      getBranch,
      createOrUpdateFileContents,
      createRelease,
      merge,
    },
    git: { createRef, createTag },
    pulls,
    issues: { createComment },
  },
} = octokit;

describe("main()", () => {
  const changes = [
    {
      number: 6,
      title: "title",
      state: "closed",
      labels: [{ name: "label" }, { name: "type: fix" }],
    },
    {
      number: 5,
      title: "title",
      state: "closed",
      labels: [{ name: "label" }, { name: "type: feature" }],
    },
    {
      number: 4,
      title: "title",
      state: "closed",
      labels: [{ name: "label" }],
    },
    {
      number: 3,
      title: "title",
      state: "closed",
      labels: [{ name: "release: done" }],
    },
    {
      number: 2,
      title: "title",
      state: "closed",
      labels: [{ name: "breaking" }],
    },
  ];

  beforeEach(() => {
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
    readFileSync.mockReturnValue(
      '{"name": "@owner/application", "version": "1.2.3-alpha.4", "dependencies": {}}',
    );
    generateReleaseNotes.mockResolvedValue({
      data: {
        body: "Release notes\n\n- title (#4)\n- title (#5)\n- title (#6)\n- title (#7)\n\nThe end.",
      },
    });
    getBranch.mockRejectedValue({
      name: "HttpError",
      status: 404,
      message: "Branch not found",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should request when changes", async () => {
    mockPullRequestLists({ changes });
    pulls.create.mockResolvedValueOnce({
      data: {
        number: 1,
      },
    });

    await main();

    expect(setFailed).toHaveBeenCalledTimes(0);
    expect(error).toHaveBeenCalledTimes(0);
    expect(warning).toHaveBeenCalledTimes(0);
    expect(notice).toHaveBeenCalledTimes(4);
    expect(notice).toHaveBeenNthCalledWith(2, "Next version is 1.3.0.", {
      title: "Next Version",
    });
    expect(notice).toHaveBeenNthCalledWith(
      3,
      'Next release branch "releases/next" has been created.',
      { title: "Branch Created" },
    );
    expect(notice).toHaveBeenNthCalledWith(
      4,
      "Release PR #1 has been opened.",
      { title: "PR Opened" },
    );
    expect(setOutput).toHaveBeenCalledTimes(4);
    expect(setOutput).toHaveBeenNthCalledWith(
      1,
      "current-version",
      "1.2.3-alpha.4",
    );
    expect(setOutput).toHaveBeenNthCalledWith(2, "is-released", false);
    expect(setOutput).toHaveBeenNthCalledWith(3, "next-version", "1.3.0");
    expect(setOutput).toHaveBeenNthCalledWith(4, "release-pr", 1);
    expect(generateReleaseNotes).toHaveBeenCalledTimes(1);
    expect(generateReleaseNotes).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      tag_name: "v1.3.0",
      target_commitish: "contextSha",
    });
    expect(getBranch).toHaveBeenCalledTimes(1);
    expect(getBranch).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      branch: "releases/next",
    });
    expect(createRef).toHaveBeenCalledTimes(1);
    expect(createRef).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      ref: "refs/heads/releases/next",
      sha: "contextSha",
    });
    expect(merge).toHaveBeenCalledTimes(0);
    expect(readFileSync).toHaveBeenCalledTimes(2);
    expect(readFileSync).toHaveBeenNthCalledWith(1, "package.json", "utf8");
    expect(readFileSync).toHaveBeenNthCalledWith(2, "package.json", "utf8");
    expect(getContent).toHaveBeenCalledTimes(1);
    expect(getContent).toHaveBeenNthCalledWith(1, {
      owner: "owner",
      repo: "repository",
      path: "package.json",
      ref: "refs/heads/releases/next",
    });
    expect(createOrUpdateFileContents).toHaveBeenCalledTimes(1);
    expect(createOrUpdateFileContents).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      branch: "releases/next",
      path: "package.json",
      message: "chore(main): release v1.3.0",
      sha: "packageSha",
      content:
        "ewogICJuYW1lIjogIkBvd25lci9hcHBsaWNhdGlvbiIsCiAgInZlcnNpb24iOiAiMS4zLjAiLAogICJkZXBlbmRlbmNpZXMiOiB7fQp9Cg==",
    });
    expect(pulls.create).toHaveBeenCalledTimes(1);
    expect(pulls.create).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      title: "Release v1.3.0",
      head: "releases/next",
      base: "main",
      body: "Release notes\n\n- title (#4)\n- title (#5)\n- title (#6)\n- title (#7)\n\nThe end.",
    });
    expect(pulls.update).toHaveBeenCalledTimes(0);
    expect(createComment).toHaveBeenCalledTimes(0);
  });

  it("should not request when release", async () => {
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
    expect(setOutput).toHaveBeenCalledTimes(4);
    expect(setOutput).toHaveBeenNthCalledWith(
      1,
      "current-version",
      "1.2.3-alpha.4",
    );
    expect(setOutput).toHaveBeenNthCalledWith(2, "is-released", true);
    expect(setOutput).toHaveBeenNthCalledWith(3, "next-version", undefined);
    expect(setOutput).toHaveBeenNthCalledWith(4, "release-pr", undefined);
    expect(generateReleaseNotes).toHaveBeenCalledTimes(0);
    expect(getBranch).toHaveBeenCalledTimes(0);
    expect(createRef).toHaveBeenCalledTimes(0);
    expect(merge).toHaveBeenCalledTimes(0);
    expect(readFileSync).toHaveBeenCalledTimes(1);
    expect(getContent).toHaveBeenCalledTimes(0);
    expect(createOrUpdateFileContents).toHaveBeenCalledTimes(0);
    expect(pulls.create).toHaveBeenCalledTimes(0);
    expect(pulls.update).toHaveBeenCalledTimes(0);
    expect(createComment).toHaveBeenCalledTimes(1);
    expect(createComment).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      issue_number: 1,
      body: ":package: [**application v1.2.3**](https://url.com) has been released.",
    });
  });

  it("should not request when no changes", async () => {
    await main();

    expect(setFailed).toHaveBeenCalledTimes(0);
    expect(error).toHaveBeenCalledTimes(0);
    expect(warning).toHaveBeenCalledTimes(0);
    expect(notice).toHaveBeenCalledTimes(2);
    expect(notice).toHaveBeenNthCalledWith(
      2,
      "No changes since last release.",
      {
        title: "No Changes",
      },
    );
    expect(setOutput).toHaveBeenCalledTimes(4);
    expect(setOutput).toHaveBeenNthCalledWith(
      1,
      "current-version",
      "1.2.3-alpha.4",
    );
    expect(setOutput).toHaveBeenNthCalledWith(2, "is-released", false);
    expect(setOutput).toHaveBeenNthCalledWith(3, "next-version", undefined);
    expect(setOutput).toHaveBeenNthCalledWith(4, "release-pr", undefined);
    expect(generateReleaseNotes).toHaveBeenCalledTimes(0);
    expect(getBranch).toHaveBeenCalledTimes(0);
    expect(createRef).toHaveBeenCalledTimes(0);
    expect(merge).toHaveBeenCalledTimes(0);
    expect(readFileSync).toHaveBeenCalledTimes(1);
    expect(getContent).toHaveBeenCalledTimes(0);
    expect(createOrUpdateFileContents).toHaveBeenCalledTimes(0);
    expect(pulls.create).toHaveBeenCalledTimes(0);
    expect(pulls.update).toHaveBeenCalledTimes(0);
    expect(createComment).toHaveBeenCalledTimes(0);
  });

  it("should request with `release-as`", async () => {
    inputs.releaseAs = new SemVer("3.4.5-beta.6");
    mockPullRequestLists({ changes });
    pulls.create.mockResolvedValueOnce({
      data: {
        number: 1,
      },
    });
    generateReleaseNotes.mockResolvedValueOnce({ data: { body: "" } });

    await main();

    expect(setFailed).toHaveBeenCalledTimes(0);
    expect(error).toHaveBeenCalledTimes(0);
    expect(warning).toHaveBeenCalledTimes(0);
    expect(notice).toHaveBeenCalledTimes(4);
    expect(notice).toHaveBeenNthCalledWith(2, "Next version is 3.4.5-beta.6.", {
      title: "Next Version",
    });
    expect(notice).toHaveBeenNthCalledWith(
      3,
      'Next release branch "releases/next" has been created.',
      { title: "Branch Created" },
    );
    expect(notice).toHaveBeenNthCalledWith(
      4,
      "Release PR #1 has been opened.",
      { title: "PR Opened" },
    );
    expect(setOutput).toHaveBeenCalledTimes(4);
    expect(setOutput).toHaveBeenNthCalledWith(
      1,
      "current-version",
      "1.2.3-alpha.4",
    );
    expect(setOutput).toHaveBeenNthCalledWith(2, "is-released", false);
    expect(setOutput).toHaveBeenNthCalledWith(
      3,
      "next-version",
      "3.4.5-beta.6",
    );
    expect(setOutput).toHaveBeenNthCalledWith(4, "release-pr", 1);
    expect(generateReleaseNotes).toHaveBeenCalledTimes(1);
    expect(getBranch).toHaveBeenCalledTimes(1);
    expect(createRef).toHaveBeenCalledTimes(1);
    expect(merge).toHaveBeenCalledTimes(0);
    expect(readFileSync).toHaveBeenCalledTimes(2);
    expect(getContent).toHaveBeenCalledTimes(1);
    expect(createOrUpdateFileContents).toHaveBeenCalledTimes(1);
    expect(pulls.create).toHaveBeenCalledTimes(1);
    expect(pulls.update).toHaveBeenCalledTimes(0);
    expect(createComment).toHaveBeenCalledTimes(1);
    expect(createComment).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      issue_number: 1,
      body: "Version `3.4.5-beta.6` has been manually requested by @actor.",
    });
  });

  describe("when branch exists", () => {
    beforeEach(() => {
      getBranch.mockResolvedValueOnce({
        data: {},
      });
    });

    it("should request when changes", async () => {
      mockPullRequestLists({ changes });
      pulls.create.mockResolvedValueOnce({
        data: {
          number: 1,
        },
      });

      await main();

      expect(setFailed).toHaveBeenCalledTimes(0);
      expect(error).toHaveBeenCalledTimes(0);
      expect(warning).toHaveBeenCalledTimes(0);
      expect(notice).toHaveBeenCalledTimes(3);
      expect(notice).toHaveBeenNthCalledWith(2, "Next version is 1.3.0.", {
        title: "Next Version",
      });
      expect(notice).toHaveBeenNthCalledWith(
        3,
        "Release PR #1 has been opened.",
        { title: "PR Opened" },
      );
      expect(setOutput).toHaveBeenCalledTimes(4);
      expect(setOutput).toHaveBeenNthCalledWith(
        1,
        "current-version",
        "1.2.3-alpha.4",
      );
      expect(setOutput).toHaveBeenNthCalledWith(2, "is-released", false);
      expect(setOutput).toHaveBeenNthCalledWith(3, "next-version", "1.3.0");
      expect(setOutput).toHaveBeenNthCalledWith(4, "release-pr", 1);
      expect(generateReleaseNotes).toHaveBeenCalledTimes(1);
      expect(getBranch).toHaveBeenCalledTimes(1);
      expect(createRef).toHaveBeenCalledTimes(0);
      expect(merge).toHaveBeenCalledTimes(1);
      expect(merge).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        base: "releases/next",
        head: "main",
        commit_message: 'chore(main): merge "main"',
      });
      expect(readFileSync).toHaveBeenCalledTimes(2);
      expect(getContent).toHaveBeenCalledTimes(1);
      expect(createOrUpdateFileContents).toHaveBeenCalledTimes(1);
      expect(pulls.create).toHaveBeenCalledTimes(1);
      expect(pulls.update).toHaveBeenCalledTimes(0);
      expect(createComment).toHaveBeenCalledTimes(0);
    });
  });

  describe("when release PR open", () => {
    const { openRelease } = {
      openRelease: [
        {
          number: 2,
          title: "Release v1.3.0",
          state: "open",
          merge_commit_sha: "sha",
          labels: [{ name: inputs.releaseLabels.done }],
        },
        {
          number: 1,
          title: "Release v1.3.0",
          body: "Release notes\n\n- title (#4)\n- title (#5)\n\nThe end.",
          state: "open",
          merge_commit_sha: "sha",
          labels: [{ name: inputs.releaseLabels.ready }],
        },
      ],
    };

    it("should not prepare when no new changes", async () => {
      mockPullRequestLists({
        openRelease: [
          openRelease[0],
          {
            ...openRelease[1],
            body: "Release notes\n\n- title (#4)\n- title (#5)\n- title (#6)\n- title (#7)\n\nThe end.",
          },
        ],
        changes,
      });

      await main();

      expect(setFailed).toHaveBeenCalledTimes(0);
      expect(error).toHaveBeenCalledTimes(0);
      expect(warning).toHaveBeenCalledTimes(0);
      expect(notice).toHaveBeenCalledTimes(3);
      expect(notice).toHaveBeenNthCalledWith(2, "Next version is 1.3.0.", {
        title: "Next Version",
      });
      expect(notice).toHaveBeenNthCalledWith(
        3,
        "No new changes since the last check. Release PR #1 is up to date.",
        { title: "Up To Date" },
      );
      expect(setOutput).toHaveBeenCalledTimes(4);
      expect(setOutput).toHaveBeenNthCalledWith(
        1,
        "current-version",
        "1.2.3-alpha.4",
      );
      expect(setOutput).toHaveBeenNthCalledWith(2, "is-released", false);
      expect(setOutput).toHaveBeenNthCalledWith(3, "next-version", "1.3.0");
      expect(setOutput).toHaveBeenNthCalledWith(4, "release-pr", 1);
      expect(generateReleaseNotes).toHaveBeenCalledTimes(1);
      expect(getBranch).toHaveBeenCalledTimes(0);
      expect(createRef).toHaveBeenCalledTimes(0);
      expect(merge).toHaveBeenCalledTimes(0);
      expect(readFileSync).toHaveBeenCalledTimes(1);
      expect(getContent).toHaveBeenCalledTimes(0);
      expect(createOrUpdateFileContents).toHaveBeenCalledTimes(0);
      expect(pulls.create).toHaveBeenCalledTimes(0);
      expect(pulls.update).toHaveBeenCalledTimes(0);
      expect(createComment).toHaveBeenCalledTimes(0);
    });

    it("should not prepare when no important changes", async () => {
      mockPullRequestLists({
        openRelease: [
          openRelease[0],
          {
            ...openRelease[1],
            body: "Release notes\n\n- title (#4)\n- title (#5)\n- title (#6)\n- title (#7)\n\nThe end.",
          },
        ],
        changes: [
          {
            number: 7,
            title: "title",
            state: "closed",
            labels: [{ name: "label" }],
          },
          ...changes,
        ],
      });

      await main();

      expect(setFailed).toHaveBeenCalledTimes(0);
      expect(error).toHaveBeenCalledTimes(0);
      expect(warning).toHaveBeenCalledTimes(0);
      expect(notice).toHaveBeenCalledTimes(3);
      expect(notice).toHaveBeenNthCalledWith(2, "Next version is 1.3.0.", {
        title: "Next Version",
      });
      expect(notice).toHaveBeenNthCalledWith(
        3,
        "No new changes since the last check. Release PR #1 is up to date.",
        { title: "Up To Date" },
      );
      expect(setOutput).toHaveBeenCalledTimes(4);
      expect(setOutput).toHaveBeenNthCalledWith(
        1,
        "current-version",
        "1.2.3-alpha.4",
      );
      expect(setOutput).toHaveBeenNthCalledWith(2, "is-released", false);
      expect(setOutput).toHaveBeenNthCalledWith(3, "next-version", "1.3.0");
      expect(setOutput).toHaveBeenNthCalledWith(4, "release-pr", 1);
      expect(generateReleaseNotes).toHaveBeenCalledTimes(1);
      expect(getBranch).toHaveBeenCalledTimes(0);
      expect(createRef).toHaveBeenCalledTimes(0);
      expect(merge).toHaveBeenCalledTimes(0);
      expect(readFileSync).toHaveBeenCalledTimes(1);
      expect(getContent).toHaveBeenCalledTimes(0);
      expect(createOrUpdateFileContents).toHaveBeenCalledTimes(0);
      expect(pulls.create).toHaveBeenCalledTimes(0);
      expect(pulls.update).toHaveBeenCalledTimes(0);
      expect(createComment).toHaveBeenCalledTimes(0);
    });

    it("should prepare when changes (same version)", async () => {
      mockPullRequestLists({
        openRelease,
        changes: [
          {
            number: 7,
            title: "title",
            state: "closed",
            labels: [{ name: "label" }, { name: "type: fix" }],
          },
          ...changes,
        ],
      });

      await main();

      expect(setFailed).toHaveBeenCalledTimes(0);
      expect(error).toHaveBeenCalledTimes(0);
      expect(warning).toHaveBeenCalledTimes(0);
      expect(notice).toHaveBeenCalledTimes(3);
      expect(notice).toHaveBeenNthCalledWith(2, "Next version is 1.3.0.", {
        title: "Next Version",
      });
      expect(notice).toHaveBeenNthCalledWith(
        3,
        "The existing release PR #1 has been updated.",
        { title: "PR Updated" },
      );
      expect(setOutput).toHaveBeenCalledTimes(4);
      expect(setOutput).toHaveBeenNthCalledWith(
        1,
        "current-version",
        "1.2.3-alpha.4",
      );
      expect(setOutput).toHaveBeenNthCalledWith(2, "is-released", false);
      expect(setOutput).toHaveBeenNthCalledWith(3, "next-version", "1.3.0");
      expect(setOutput).toHaveBeenNthCalledWith(4, "release-pr", 1);
      expect(generateReleaseNotes).toHaveBeenCalledTimes(1);
      expect(getBranch).toHaveBeenCalledTimes(0);
      expect(createRef).toHaveBeenCalledTimes(0);
      expect(merge).toHaveBeenCalledTimes(1);
      expect(merge).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        base: "releases/next",
        head: "main",
        commit_message: 'chore(main): merge "main"',
      });
      expect(readFileSync).toHaveBeenCalledTimes(1);
      expect(getContent).toHaveBeenCalledTimes(0);
      expect(createOrUpdateFileContents).toHaveBeenCalledTimes(0);
      expect(pulls.create).toHaveBeenCalledTimes(0);
      expect(pulls.update).toHaveBeenCalledTimes(1);
      expect(pulls.update).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        title: "Release v1.3.0",
        pull_number: 1,
        body: "Release notes\n\n- title (#4)\n- title (#5)\n- title (#6)\n- title (#7)\n\nThe end.",
      });
      expect(createComment).toHaveBeenCalledTimes(1);
      expect(createComment).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        issue_number: 1,
        body: "Content has been updated:\n\n```diff\n+  - title (#6)\n+  - title (#7)\n```",
      });
    });

    it("should prepare when changes (new version)", async () => {
      mockPullRequestLists({
        openRelease,
        changes: [
          {
            number: 7,
            title: "title",
            state: "closed",
            labels: [
              { name: "label" },
              { name: "type: feature" },
              { name: "breaking" },
            ],
          },
          ...changes,
        ],
      });

      await main();

      expect(setFailed).toHaveBeenCalledTimes(0);
      expect(error).toHaveBeenCalledTimes(0);
      expect(warning).toHaveBeenCalledTimes(0);
      expect(notice).toHaveBeenCalledTimes(3);
      expect(notice).toHaveBeenNthCalledWith(2, "Next version is 2.0.0.", {
        title: "Next Version",
      });
      expect(notice).toHaveBeenNthCalledWith(
        3,
        "The existing release PR #1 has been updated.",
        { title: "PR Updated" },
      );
      expect(setOutput).toHaveBeenCalledTimes(4);
      expect(setOutput).toHaveBeenNthCalledWith(
        1,
        "current-version",
        "1.2.3-alpha.4",
      );
      expect(setOutput).toHaveBeenNthCalledWith(2, "is-released", false);
      expect(setOutput).toHaveBeenNthCalledWith(3, "next-version", "2.0.0");
      expect(setOutput).toHaveBeenNthCalledWith(4, "release-pr", 1);
      expect(generateReleaseNotes).toHaveBeenCalledTimes(1);
      expect(getBranch).toHaveBeenCalledTimes(0);
      expect(createRef).toHaveBeenCalledTimes(0);
      expect(merge).toHaveBeenCalledTimes(1);
      expect(merge).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        base: "releases/next",
        head: "main",
        commit_message: 'chore(main): merge "main"',
      });
      expect(readFileSync).toHaveBeenCalledTimes(2);
      expect(readFileSync).toHaveBeenNthCalledWith(2, "package.json", "utf8");
      expect(getContent).toHaveBeenCalledTimes(1);
      expect(createOrUpdateFileContents).toHaveBeenCalledTimes(1);
      expect(pulls.create).toHaveBeenCalledTimes(0);
      expect(pulls.update).toHaveBeenCalledTimes(1);
      expect(pulls.update).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        title: "Release v2.0.0",
        pull_number: 1,
        body: "Release notes\n\n- title (#4)\n- title (#5)\n- title (#6)\n- title (#7)\n\nThe end.",
      });
      expect(createComment).toHaveBeenCalledTimes(1);
      expect(createComment).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        issue_number: 1,
        body: "Content has been updated:\n\n```diff\n+  - title (#6)\n+  - title (#7)\n```",
      });
    });

    it("should prepare when only change is pre-release", async () => {
      inputs.preRelease = "beta";
      mockPullRequestLists({
        openRelease,
        changes,
      });

      await main();

      expect(setFailed).toHaveBeenCalledTimes(0);
      expect(error).toHaveBeenCalledTimes(0);
      expect(warning).toHaveBeenCalledTimes(0);
      expect(notice).toHaveBeenCalledTimes(3);
      expect(notice).toHaveBeenNthCalledWith(
        2,
        "Next version is 1.3.0-beta.0.",
        {
          title: "Next Version",
        },
      );
      expect(notice).toHaveBeenNthCalledWith(
        3,
        "The existing release PR #1 has been updated.",
        { title: "PR Updated" },
      );
      expect(setOutput).toHaveBeenCalledTimes(4);
      expect(setOutput).toHaveBeenNthCalledWith(
        1,
        "current-version",
        "1.2.3-alpha.4",
      );
      expect(setOutput).toHaveBeenNthCalledWith(2, "is-released", false);
      expect(setOutput).toHaveBeenNthCalledWith(
        3,
        "next-version",
        "1.3.0-beta.0",
      );
      expect(setOutput).toHaveBeenNthCalledWith(4, "release-pr", 1);
      expect(generateReleaseNotes).toHaveBeenCalledTimes(1);
      expect(getBranch).toHaveBeenCalledTimes(0);
      expect(createRef).toHaveBeenCalledTimes(0);
      expect(merge).toHaveBeenCalledTimes(1);
      expect(merge).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        base: "releases/next",
        head: "main",
        commit_message: 'chore(main): merge "main"',
      });
      expect(readFileSync).toHaveBeenCalledTimes(2);
      expect(getContent).toHaveBeenCalledTimes(1);
      expect(createOrUpdateFileContents).toHaveBeenCalledTimes(1);
      expect(pulls.create).toHaveBeenCalledTimes(0);
      expect(pulls.update).toHaveBeenCalledTimes(1);
      expect(createComment).toHaveBeenCalledTimes(1);
      expect(createComment).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        issue_number: 1,
        body: "Version `1.3.0-beta.0` has been manually requested by @actor.\n\nContent has been updated:\n\n```diff\n+  - title (#6)\n+  - title (#7)\n```",
      });
    });
  });
});
