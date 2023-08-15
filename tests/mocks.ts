process.env["GITHUB_TOKEN"] = "token";

const githubResponse = { data: undefined };
const githubResponseList = { data: [] };

export const core = {
  setFailed: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  notice: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  group: jest.fn(),
  getInput: jest.fn().mockReturnValue(""),
  setOutput: jest.fn(),
};

export const octokit = {
  paginate: jest.fn().mockResolvedValue(githubResponseList),
  rest: {
    git: {
      createRef: jest.fn().mockResolvedValue(githubResponse),
      createTag: jest.fn().mockResolvedValue(githubResponse),
    },
    repos: {
      getContent: jest.fn().mockResolvedValue({
        data: { sha: "packageSha" },
      }),
      getBranch: jest.fn().mockResolvedValue(githubResponse),
      generateReleaseNotes: jest.fn().mockResolvedValue(githubResponse),
      createOrUpdateFileContents: jest.fn().mockResolvedValue(githubResponse),
      createRelease: jest.fn().mockResolvedValue(githubResponse),
    },
    pulls: {
      list: jest.fn().mockResolvedValue(githubResponseList),
      create: jest.fn().mockResolvedValue(githubResponse),
      update: jest.fn().mockResolvedValue(githubResponse),
    },
    issues: {
      update: jest.fn().mockResolvedValue(githubResponse),
      addLabels: jest.fn().mockResolvedValue(githubResponse),
      createComment: jest.fn().mockResolvedValue(githubResponse),
    },
  },
};

export const context = {
  repo: { owner: "owner", repo: "repository" },
  sha: "contextSha",
  actor: "actor",
  eventName: "workflow_dispatch",
};

export const fileSystem = {
  readFileSync: jest.fn(),
};

core.group.mockImplementation(async (_, fn) => {
  return fn();
});

octokit.paginate.mockImplementation(async (fn, args, callback) => {
  const results: unknown[] = [];
  let isDone = false;
  const done = () => {
    isDone = true;
  };
  while (!isDone) {
    const { data } = await fn(args);
    if (!data?.length) {
      break;
    }

    const newData = await callback({ data }, done);
    if (newData?.length > 0) {
      results.push(...newData);
    } else {
      break;
    }
  }

  return results;
});

jest.mock("@actions/core", () => {
  return core;
});

jest.mock("@actions/github", () => {
  return {
    getOctokit: () => octokit,
    context,
  };
});

jest.mock("fs", () => {
  return fileSystem;
});

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
