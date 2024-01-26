import { SemVer } from "semver";
import { inputs } from "../src/libs/inputs";
import { main } from "../src/main";
import { mockPullRequestLists } from "../tests/helpers";
import { core, fileSystem, octokit } from "../tests/mocks";

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
    inputs.preRelease = null;
    inputs.releaseAs = null;
    inputs.releaseLabels = {
      ignore: "changelog-ignore",
      patch: "type: fix",
      minor: "type: feature",
      major: "breaking",
      ready: "release: ready",
      done: "release: done",
    };
    fileSystem.readFileSync.mockReturnValue(
      '{"name": "@owner/application", "version": "1.2.3-alpha.4", "dependencies": {}}',
    );
    octokit.rest.repos.generateReleaseNotes.mockResolvedValue({
      data: {
        body: "Release notes\n\n- title (#4)\n- title (#5)\n- title (#6)\n- title (#7)\n\nThe end.",
      },
    });
    octokit.rest.repos.getBranch.mockRejectedValue({
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
    octokit.rest.pulls.create.mockResolvedValueOnce({
      data: {
        number: 1,
      },
    });

    await main();

    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.warning).toHaveBeenCalledTimes(0);
    expect(core.notice).toHaveBeenCalledTimes(4);
    expect(core.notice).toHaveBeenNthCalledWith(2, "Next version is 1.3.0.", {
      title: "Next Version",
    });
    expect(core.notice).toHaveBeenNthCalledWith(
      3,
      'Next release branch "releases/next" has been created.',
      { title: "Branch Created" },
    );
    expect(core.notice).toHaveBeenNthCalledWith(
      4,
      "Release PR #1 has been opened.",
      { title: "PR Opened" },
    );
    expect(core.setOutput).toHaveBeenCalledTimes(5);
    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      "current-version",
      "1.2.3-alpha.4",
    );
    expect(core.setOutput).toHaveBeenNthCalledWith(2, "pre-release", "alpha");
    expect(core.setOutput).toHaveBeenNthCalledWith(3, "is-released", false);
    expect(core.setOutput).toHaveBeenNthCalledWith(4, "next-version", "1.3.0");
    expect(core.setOutput).toHaveBeenNthCalledWith(5, "release-pr", 1);
    expect(octokit.rest.repos.generateReleaseNotes).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.generateReleaseNotes).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      tag_name: "v1.3.0",
      target_commitish: "contextSha",
    });
    expect(octokit.rest.repos.getBranch).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.getBranch).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      branch: "releases/next",
    });
    expect(octokit.rest.git.createRef).toHaveBeenCalledTimes(1);
    expect(octokit.rest.git.createRef).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      ref: "refs/heads/releases/next",
      sha: "contextSha",
    });
    expect(octokit.rest.repos.merge).toHaveBeenCalledTimes(0);
    expect(fileSystem.readFileSync).toHaveBeenCalledTimes(2);
    expect(fileSystem.readFileSync).toHaveBeenNthCalledWith(
      1,
      "package.json",
      "utf8",
    );
    expect(fileSystem.readFileSync).toHaveBeenNthCalledWith(
      2,
      "package.json",
      "utf8",
    );
    expect(octokit.rest.repos.getContent).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.getContent).toHaveBeenNthCalledWith(1, {
      owner: "owner",
      repo: "repository",
      path: "package.json",
      ref: "refs/heads/releases/next",
    });
    expect(octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(
      1,
    );
    expect(octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      branch: "releases/next",
      path: "package.json",
      message: "chore(main): release v1.3.0",
      sha: "packageSha",
      content:
        "ewogICJuYW1lIjogIkBvd25lci9hcHBsaWNhdGlvbiIsCiAgInZlcnNpb24iOiAiMS4zLjAiLAogICJkZXBlbmRlbmNpZXMiOiB7fQp9Cg==",
    });
    expect(octokit.rest.pulls.create).toHaveBeenCalledTimes(1);
    expect(octokit.rest.pulls.create).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      title: "chore(main): release v1.3.0",
      head: "releases/next",
      base: "main",
      body: "Release notes\n\n- title (#4)\n- title (#5)\n- title (#6)\n- title (#7)\n\nThe end.",
    });
    expect(octokit.rest.pulls.update).toHaveBeenCalledTimes(0);
    expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(0);
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
    expect(octokit.rest.repos.generateReleaseNotes).toHaveBeenCalledTimes(0);
    expect(octokit.rest.repos.getBranch).toHaveBeenCalledTimes(0);
    expect(octokit.rest.git.createRef).toHaveBeenCalledTimes(0);
    expect(octokit.rest.repos.merge).toHaveBeenCalledTimes(0);
    expect(fileSystem.readFileSync).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.getContent).toHaveBeenCalledTimes(0);
    expect(octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(
      0,
    );
    expect(octokit.rest.pulls.create).toHaveBeenCalledTimes(0);
    expect(octokit.rest.pulls.update).toHaveBeenCalledTimes(0);
    expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(1);
    expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      issue_number: 1,
      body: ":package: [**application v1.2.3**](https://url.com) has been released.",
    });
  });

  it("should not request when no changes", async () => {
    await main();

    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.warning).toHaveBeenCalledTimes(0);
    expect(core.notice).toHaveBeenCalledTimes(2);
    expect(core.notice).toHaveBeenNthCalledWith(
      2,
      "No changes since last release.",
      {
        title: "No Changes",
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
    expect(octokit.rest.repos.generateReleaseNotes).toHaveBeenCalledTimes(0);
    expect(octokit.rest.repos.getBranch).toHaveBeenCalledTimes(0);
    expect(octokit.rest.git.createRef).toHaveBeenCalledTimes(0);
    expect(octokit.rest.repos.merge).toHaveBeenCalledTimes(0);
    expect(fileSystem.readFileSync).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.getContent).toHaveBeenCalledTimes(0);
    expect(octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(
      0,
    );
    expect(octokit.rest.pulls.create).toHaveBeenCalledTimes(0);
    expect(octokit.rest.pulls.update).toHaveBeenCalledTimes(0);
    expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(0);
  });

  it("should request with `release-as`", async () => {
    inputs.releaseAs = new SemVer("3.4.5-beta.6");
    mockPullRequestLists({ changes });
    octokit.rest.pulls.create.mockResolvedValueOnce({
      data: {
        number: 1,
      },
    });
    octokit.rest.repos.generateReleaseNotes.mockResolvedValueOnce({
      data: { body: "" },
    });

    await main();

    expect(core.setFailed).toHaveBeenCalledTimes(0);
    expect(core.error).toHaveBeenCalledTimes(0);
    expect(core.warning).toHaveBeenCalledTimes(0);
    expect(core.notice).toHaveBeenCalledTimes(4);
    expect(core.notice).toHaveBeenNthCalledWith(
      2,
      "Next version is 3.4.5-beta.6.",
      {
        title: "Next Version",
      },
    );
    expect(core.notice).toHaveBeenNthCalledWith(
      3,
      'Next release branch "releases/next" has been created.',
      { title: "Branch Created" },
    );
    expect(core.notice).toHaveBeenNthCalledWith(
      4,
      "Release PR #1 has been opened.",
      { title: "PR Opened" },
    );
    expect(core.setOutput).toHaveBeenCalledTimes(5);
    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      "current-version",
      "1.2.3-alpha.4",
    );
    expect(core.setOutput).toHaveBeenNthCalledWith(2, "pre-release", "alpha");
    expect(core.setOutput).toHaveBeenNthCalledWith(3, "is-released", false);
    expect(core.setOutput).toHaveBeenNthCalledWith(
      4,
      "next-version",
      "3.4.5-beta.6",
    );
    expect(core.setOutput).toHaveBeenNthCalledWith(5, "release-pr", 1);
    expect(octokit.rest.repos.generateReleaseNotes).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.getBranch).toHaveBeenCalledTimes(1);
    expect(octokit.rest.git.createRef).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.merge).toHaveBeenCalledTimes(0);
    expect(fileSystem.readFileSync).toHaveBeenCalledTimes(2);
    expect(octokit.rest.repos.getContent).toHaveBeenCalledTimes(1);
    expect(octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(
      1,
    );
    expect(octokit.rest.pulls.create).toHaveBeenCalledTimes(1);
    expect(octokit.rest.pulls.update).toHaveBeenCalledTimes(0);
    expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(1);
    expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repository",
      issue_number: 1,
      body: "Version `3.4.5-beta.6` has been manually requested by @actor.",
    });
  });

  describe("when branch exists", () => {
    beforeEach(() => {
      octokit.rest.repos.getBranch.mockResolvedValueOnce({
        data: {},
      });
    });

    it("should request when changes", async () => {
      mockPullRequestLists({ changes });
      octokit.rest.pulls.create.mockResolvedValueOnce({
        data: {
          number: 1,
        },
      });

      await main();

      expect(core.setFailed).toHaveBeenCalledTimes(0);
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.warning).toHaveBeenCalledTimes(0);
      expect(core.notice).toHaveBeenCalledTimes(3);
      expect(core.notice).toHaveBeenNthCalledWith(2, "Next version is 1.3.0.", {
        title: "Next Version",
      });
      expect(core.notice).toHaveBeenNthCalledWith(
        3,
        "Release PR #1 has been opened.",
        { title: "PR Opened" },
      );
      expect(core.setOutput).toHaveBeenCalledTimes(5);
      expect(core.setOutput).toHaveBeenNthCalledWith(
        1,
        "current-version",
        "1.2.3-alpha.4",
      );
      expect(core.setOutput).toHaveBeenNthCalledWith(2, "pre-release", "alpha");
      expect(core.setOutput).toHaveBeenNthCalledWith(3, "is-released", false);
      expect(core.setOutput).toHaveBeenNthCalledWith(
        4,
        "next-version",
        "1.3.0",
      );
      expect(core.setOutput).toHaveBeenNthCalledWith(5, "release-pr", 1);
      expect(octokit.rest.repos.generateReleaseNotes).toHaveBeenCalledTimes(1);
      expect(octokit.rest.repos.getBranch).toHaveBeenCalledTimes(1);
      expect(octokit.rest.git.createRef).toHaveBeenCalledTimes(0);
      expect(octokit.rest.repos.merge).toHaveBeenCalledTimes(1);
      expect(octokit.rest.repos.merge).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        base: "releases/next",
        head: "main",
        commit_message: 'chore(main): merge "main"',
      });
      expect(fileSystem.readFileSync).toHaveBeenCalledTimes(2);
      expect(octokit.rest.repos.getContent).toHaveBeenCalledTimes(1);
      expect(
        octokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledTimes(1);
      expect(octokit.rest.pulls.create).toHaveBeenCalledTimes(1);
      expect(octokit.rest.pulls.update).toHaveBeenCalledTimes(0);
      expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(0);
    });
  });

  describe("when release PR open", () => {
    const pullRequests = {
      openRelease: [
        {
          number: 2,
          title: "chore(main): release v1.3.0",
          state: "open",
          merge_commit_sha: "sha",
          labels: [{ name: inputs.releaseLabels.done }],
        },
        {
          number: 1,
          title: "chore(main): release v1.3.0",
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
          pullRequests.openRelease[0],
          {
            ...pullRequests.openRelease[1],
            body: "Release notes\n\n- title (#4)\n- title (#5)\n- title (#6)\n- title (#7)\n\nThe end.",
          },
        ],
        changes,
      });

      await main();

      expect(core.setFailed).toHaveBeenCalledTimes(0);
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.warning).toHaveBeenCalledTimes(0);
      expect(core.notice).toHaveBeenCalledTimes(3);
      expect(core.notice).toHaveBeenNthCalledWith(2, "Next version is 1.3.0.", {
        title: "Next Version",
      });
      expect(core.notice).toHaveBeenNthCalledWith(
        3,
        "No new changes since the last check. Release PR #1 is up to date.",
        { title: "Up To Date" },
      );
      expect(core.setOutput).toHaveBeenCalledTimes(5);
      expect(core.setOutput).toHaveBeenNthCalledWith(
        1,
        "current-version",
        "1.2.3-alpha.4",
      );
      expect(core.setOutput).toHaveBeenNthCalledWith(2, "pre-release", "alpha");
      expect(core.setOutput).toHaveBeenNthCalledWith(3, "is-released", false);
      expect(core.setOutput).toHaveBeenNthCalledWith(
        4,
        "next-version",
        "1.3.0",
      );
      expect(core.setOutput).toHaveBeenNthCalledWith(5, "release-pr", 1);
      expect(octokit.rest.repos.generateReleaseNotes).toHaveBeenCalledTimes(1);
      expect(octokit.rest.repos.getBranch).toHaveBeenCalledTimes(0);
      expect(octokit.rest.git.createRef).toHaveBeenCalledTimes(0);
      expect(octokit.rest.repos.merge).toHaveBeenCalledTimes(0);
      expect(fileSystem.readFileSync).toHaveBeenCalledTimes(1);
      expect(octokit.rest.repos.getContent).toHaveBeenCalledTimes(0);
      expect(
        octokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledTimes(0);
      expect(octokit.rest.pulls.create).toHaveBeenCalledTimes(0);
      expect(octokit.rest.pulls.update).toHaveBeenCalledTimes(0);
      expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(0);
    });

    it("should not prepare when no important changes", async () => {
      mockPullRequestLists({
        openRelease: [
          pullRequests.openRelease[0],
          {
            ...pullRequests.openRelease[1],
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

      expect(core.setFailed).toHaveBeenCalledTimes(0);
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.warning).toHaveBeenCalledTimes(0);
      expect(core.notice).toHaveBeenCalledTimes(3);
      expect(core.notice).toHaveBeenNthCalledWith(2, "Next version is 1.3.0.", {
        title: "Next Version",
      });
      expect(core.notice).toHaveBeenNthCalledWith(
        3,
        "No new changes since the last check. Release PR #1 is up to date.",
        { title: "Up To Date" },
      );
      expect(core.setOutput).toHaveBeenCalledTimes(5);
      expect(core.setOutput).toHaveBeenNthCalledWith(
        1,
        "current-version",
        "1.2.3-alpha.4",
      );
      expect(core.setOutput).toHaveBeenNthCalledWith(2, "pre-release", "alpha");
      expect(core.setOutput).toHaveBeenNthCalledWith(3, "is-released", false);
      expect(core.setOutput).toHaveBeenNthCalledWith(
        4,
        "next-version",
        "1.3.0",
      );
      expect(core.setOutput).toHaveBeenNthCalledWith(5, "release-pr", 1);
      expect(octokit.rest.repos.generateReleaseNotes).toHaveBeenCalledTimes(1);
      expect(octokit.rest.repos.getBranch).toHaveBeenCalledTimes(0);
      expect(octokit.rest.git.createRef).toHaveBeenCalledTimes(0);
      expect(octokit.rest.repos.merge).toHaveBeenCalledTimes(0);
      expect(fileSystem.readFileSync).toHaveBeenCalledTimes(1);
      expect(octokit.rest.repos.getContent).toHaveBeenCalledTimes(0);
      expect(
        octokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledTimes(0);
      expect(octokit.rest.pulls.create).toHaveBeenCalledTimes(0);
      expect(octokit.rest.pulls.update).toHaveBeenCalledTimes(0);
      expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(0);
    });

    it("should prepare when changes (same version)", async () => {
      mockPullRequestLists({
        openRelease: pullRequests.openRelease,
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

      expect(core.setFailed).toHaveBeenCalledTimes(0);
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.warning).toHaveBeenCalledTimes(0);
      expect(core.notice).toHaveBeenCalledTimes(3);
      expect(core.notice).toHaveBeenNthCalledWith(2, "Next version is 1.3.0.", {
        title: "Next Version",
      });
      expect(core.notice).toHaveBeenNthCalledWith(
        3,
        "The existing release PR #1 has been updated.",
        { title: "PR Updated" },
      );
      expect(core.setOutput).toHaveBeenCalledTimes(5);
      expect(core.setOutput).toHaveBeenNthCalledWith(
        1,
        "current-version",
        "1.2.3-alpha.4",
      );
      expect(core.setOutput).toHaveBeenNthCalledWith(2, "pre-release", "alpha");
      expect(core.setOutput).toHaveBeenNthCalledWith(3, "is-released", false);
      expect(core.setOutput).toHaveBeenNthCalledWith(
        4,
        "next-version",
        "1.3.0",
      );
      expect(core.setOutput).toHaveBeenNthCalledWith(5, "release-pr", 1);
      expect(octokit.rest.repos.generateReleaseNotes).toHaveBeenCalledTimes(1);
      expect(octokit.rest.repos.getBranch).toHaveBeenCalledTimes(0);
      expect(octokit.rest.git.createRef).toHaveBeenCalledTimes(0);
      expect(octokit.rest.repos.merge).toHaveBeenCalledTimes(1);
      expect(octokit.rest.repos.merge).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        base: "releases/next",
        head: "main",
        commit_message: 'chore(main): merge "main"',
      });
      expect(fileSystem.readFileSync).toHaveBeenCalledTimes(1);
      expect(octokit.rest.repos.getContent).toHaveBeenCalledTimes(0);
      expect(
        octokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledTimes(0);
      expect(octokit.rest.pulls.create).toHaveBeenCalledTimes(0);
      expect(octokit.rest.pulls.update).toHaveBeenCalledTimes(1);
      expect(octokit.rest.pulls.update).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        title: "chore(main): release v1.3.0",
        pull_number: 1,
        body: "Release notes\n\n- title (#4)\n- title (#5)\n- title (#6)\n- title (#7)\n\nThe end.",
      });
      expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(1);
      expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        issue_number: 1,
        body: "Content has been updated:\n\n```diff\n+  - title (#6)\n+  - title (#7)\n```",
      });
    });

    it("should prepare when changes (new version)", async () => {
      mockPullRequestLists({
        openRelease: pullRequests.openRelease,
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

      expect(core.setFailed).toHaveBeenCalledTimes(0);
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.warning).toHaveBeenCalledTimes(0);
      expect(core.notice).toHaveBeenCalledTimes(3);
      expect(core.notice).toHaveBeenNthCalledWith(2, "Next version is 2.0.0.", {
        title: "Next Version",
      });
      expect(core.notice).toHaveBeenNthCalledWith(
        3,
        "The existing release PR #1 has been updated.",
        { title: "PR Updated" },
      );
      expect(core.setOutput).toHaveBeenCalledTimes(5);
      expect(core.setOutput).toHaveBeenNthCalledWith(
        1,
        "current-version",
        "1.2.3-alpha.4",
      );
      expect(core.setOutput).toHaveBeenNthCalledWith(2, "pre-release", "alpha");
      expect(core.setOutput).toHaveBeenNthCalledWith(3, "is-released", false);
      expect(core.setOutput).toHaveBeenNthCalledWith(
        4,
        "next-version",
        "2.0.0",
      );
      expect(core.setOutput).toHaveBeenNthCalledWith(5, "release-pr", 1);
      expect(octokit.rest.repos.generateReleaseNotes).toHaveBeenCalledTimes(1);
      expect(octokit.rest.repos.getBranch).toHaveBeenCalledTimes(0);
      expect(octokit.rest.git.createRef).toHaveBeenCalledTimes(0);
      expect(octokit.rest.repos.merge).toHaveBeenCalledTimes(1);
      expect(octokit.rest.repos.merge).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        base: "releases/next",
        head: "main",
        commit_message: 'chore(main): merge "main"',
      });
      expect(fileSystem.readFileSync).toHaveBeenCalledTimes(2);
      expect(fileSystem.readFileSync).toHaveBeenNthCalledWith(
        2,
        "package.json",
        "utf8",
      );
      expect(octokit.rest.repos.getContent).toHaveBeenCalledTimes(1);
      expect(
        octokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledTimes(1);
      expect(octokit.rest.pulls.create).toHaveBeenCalledTimes(0);
      expect(octokit.rest.pulls.update).toHaveBeenCalledTimes(1);
      expect(octokit.rest.pulls.update).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        title: "chore(main): release v2.0.0",
        pull_number: 1,
        body: "Release notes\n\n- title (#4)\n- title (#5)\n- title (#6)\n- title (#7)\n\nThe end.",
      });
      expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(1);
      expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        issue_number: 1,
        body: "Content has been updated:\n\n```diff\n+  - title (#6)\n+  - title (#7)\n```",
      });
    });

    it("should prepare when only change is pre-release", async () => {
      inputs.preRelease = "beta";
      mockPullRequestLists({
        openRelease: pullRequests.openRelease,
        changes,
      });

      await main();

      expect(core.setFailed).toHaveBeenCalledTimes(0);
      expect(core.error).toHaveBeenCalledTimes(0);
      expect(core.warning).toHaveBeenCalledTimes(0);
      expect(core.notice).toHaveBeenCalledTimes(3);
      expect(core.notice).toHaveBeenNthCalledWith(
        2,
        "Next version is 1.3.0-beta.0.",
        {
          title: "Next Version",
        },
      );
      expect(core.notice).toHaveBeenNthCalledWith(
        3,
        "The existing release PR #1 has been updated.",
        { title: "PR Updated" },
      );
      expect(core.setOutput).toHaveBeenCalledTimes(5);
      expect(core.setOutput).toHaveBeenNthCalledWith(
        1,
        "current-version",
        "1.2.3-alpha.4",
      );
      expect(core.setOutput).toHaveBeenNthCalledWith(2, "pre-release", "alpha");
      expect(core.setOutput).toHaveBeenNthCalledWith(3, "is-released", false);
      expect(core.setOutput).toHaveBeenNthCalledWith(
        4,
        "next-version",
        "1.3.0-beta.0",
      );
      expect(core.setOutput).toHaveBeenNthCalledWith(5, "release-pr", 1);
      expect(octokit.rest.repos.generateReleaseNotes).toHaveBeenCalledTimes(1);
      expect(octokit.rest.repos.getBranch).toHaveBeenCalledTimes(0);
      expect(octokit.rest.git.createRef).toHaveBeenCalledTimes(0);
      expect(octokit.rest.repos.merge).toHaveBeenCalledTimes(1);
      expect(octokit.rest.repos.merge).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        base: "releases/next",
        head: "main",
        commit_message: 'chore(main): merge "main"',
      });
      expect(fileSystem.readFileSync).toHaveBeenCalledTimes(2);
      expect(octokit.rest.repos.getContent).toHaveBeenCalledTimes(1);
      expect(
        octokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledTimes(1);
      expect(octokit.rest.pulls.create).toHaveBeenCalledTimes(0);
      expect(octokit.rest.pulls.update).toHaveBeenCalledTimes(1);
      expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(1);
      expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repository",
        issue_number: 1,
        body: "Version `1.3.0-beta.0` has been manually requested by @actor.\n\nContent has been updated:\n\n```diff\n+  - title (#6)\n+  - title (#7)\n```",
      });
    });
  });
});
