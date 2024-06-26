# Release Action

PR-based Github Action for releasing Node.js projects.

> [!CAUTION]
> This project is still in experimental phase, it is subject to breaking changes and therefore not suitable for production.

[Issues](https://github.com/cyberspace7/release-action/issues) roadmap can be tracked
[here](https://github.com/cyberspace7/release-action/milestones), don't hesitate to upvote
issues you want to be treated.
If you have any question, remark, suggestion, ... They are most welcome in the
[Discussions](https://github.com/cyberspace7/release-action/discussions)!

## Table of Contents

- [Release Action](#release-action)
  - [Table of Contents](#table-of-contents)
  - [Description](#description)
    - [When it should be used](#when-it-should-be-used)
    - [When it should not be used](#when-it-should-not-be-used)
  - [Usage](#usage)
    - [Permissions](#permissions)
    - [Inputs](#inputs)
    - [Outputs](#outputs)
    - [Secrets](#secrets)
    - [Environment variables](#environment-variables)
    - [Examples](#examples)
  - [Contributing](#contributing)
  - [Authors](#authors)
  - [Licensing](#licensing)

## Description

It can be quite a hassle to find a proper release process that meet simple but
specific and multiple demands, such as:

- To bump automatically the version based on changes type (patch, minor, major);
- To only modify `package.json`;
- To be able to ignore a specific change;
- To handle releases through a release PR;
- To create a GitHub release;
- To be able to override the version;
- To release as pre-release (both the version number **and** the GitHub release);
- Etc...

Some tools get close but not enough. That's exactly why Release Action exists: it is a simple
automation tool for releasing Node.js projects on GitHub based on pull requests and labels.
You can easily integrate it into your workflow as it only creates a
GitHub release when a specific PR is merged. It works in two phases:

1. **Prepare**: Gets all merged PRs since last release, determines the next version based
   on labels (major, minor, patch) unless overriden (see [inputs](#inputs)) and creates
   (or updates) a pull request including the bumped version in `package.json` file;
2. **Release** (actually runs first): Once the release PR merged, a release is made on GitHub, that's it!

```mermaid
sequenceDiagram
  autonumber
  participant D as Developments
  participant P as Production Branch
  participant R as Release PR

  D ->> P: Merge PR #35;1 (fix)
  P -->> R: Open PR #35;2 (automatic)
  Note over P,R: chore(main): release v1.0.1
  D ->> P: Merge PR #35;3 (feature)
  P -->> R: Update PR #35;2 (automatic)
  Note over P,R: chore(main): release v1.1.0
  R ->> P: Merge
  Note over P: chore(main): release v1.1.0
```

Below is the prepare process when new changes are detected:

```mermaid
flowchart LR
  N1{PR exists?} -- Yes --> N2{New version?}
  N2 -- Yes --> C[Commit]
  N2 -- No --> PR
  C --> PR[PR]
  N1 -- No --> N3{Branch exists?}
  N3 -- Yes --> C
  N3 -- No --> B[Branch]
  B --> C
```

### When it should be used

It should be used if:

- Commits (that matter) are systematically pushed to the main/production branch **through pull requests**;
- Labels are used in PRs to classify the level of update (patch, minor, major);
- The release commit is just about updating the `package.json` file.

### When it should not be used

It should not be used if:

- Commits are **pushed directly** to the main/production branch;
- The version update is not managed in the `package.json` file.

## Usage

Release Action is designed to be ran every time there is a change on the main/production branch.
Here is a recommended workflow setting:

```yaml
name: Release

on:
  push:
    branches:
      - main
  workflow_dispatch:
    inputs:
      release-as: # Specify a version, especially useful for first release if no significant PRs
        type: string
        description: Force the release version
      pre-release:
        type: choice
        default: " "
        description: Pre-release
        options:
          - " "
          - alpha
          - beta
          - rc

concurrency:
  group: ${{ github.workflow }}
  cancel-in-progress: true

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    outputs:
      is-released: ${{ steps.action.outputs.is-released }}
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Execute action
        id: action
        uses: cyberspace7/release-action@v0.7.0
        with:
          release-as: ${{ inputs.release-as }}
          pre-release: ${{ inputs.pre-release }}
  publish: # Execute another job when a release has been made
    name: Publish
    needs: release
    if: needs.release.outputs.is-released == 'true'
    uses: ./.github/workflows/publish.yml
    with:
      pre-release: ${{ inputs.pre-release != '' }}
```

See the [examples](#examples) for more use cases.

> [!WARNING]
> Use a manual version (like in the example bellow) until a `v1` becomes available.
> Remember that this version **is not production ready**.

> [!TIP]
> Use the `is-released` output (see [outputs](#outputs)) to execute
> another job to deploy the fresh release (i.e. create a package, deploy a Docker container,
> etc.), as well as `pre-release`.

When opening a PR on the production branch, use one (or more) of the following labels in
order to bump the version to the right level. Labels and branches can be customised through [inputs](#inputs).

- `patch`: Bump the **patch** part of the version.
- `minor`: Bump the **minor** part of the version.
- `major`: Bump the **major** part of the version, or minor if current version is under `1.0`.
- `ignore`: Dont bump whatever other labels are. It should be excluded from
  the release notes generation (see bellow).

That's it, when merged, you should find an open release PR. You just have to merge it when you wish to release, voilà!

Changes are found comparing GitHub
[generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes),
therefore it's advised to define a `.github/release.yml` file excluding release PR labels and ignore labels so that they don't appear in the changelog:

```yaml
changelog:
  exclude:
    labels:
      - "ignore"
      - "release: ready"
      - "release: done"
```

Something's missing? Check if it's planned in
[issues](https://github.com/cyberspace7/release-action/issues), upvote it, or share your
thoughts in the [discussions](https://github.com/cyberspace7/release-action/discussions).
Don't hesite also to share your experience.

### Permissions

> [!IMPORTANT]
> Make sure to check the following permission in your repository settings:
> "Allow GitHub Actions to create and approve pull requests".

This action requires the following permissions in order to work:

```yaml
permissions:
  contents: write
  pull-requests: write
```

### Inputs

| Name                  | Description                                                                                                                                                                                 | Default Value       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `release-as`          | Force a specific version.                                                                                                                                                                   |                     |
| `pre-release`         | Name of the pre-release version (`alpha`, `beta`, `rc`...). If not empty, will trigger a pre-release.                                                                                       |                     |
| `labels-ignore`\*     | Labels for pull requests to be ignored for the release bump. It should be added to changelog excluded labels (see #usage).                                                                  | `ignore`            |
| `labels-patch`\*      | Labels for pull requests to bump a patch version.                                                                                                                                           | `patch`, `fix`      |
| `labels-minor`\*      | Labels for pull requests to bump a minor version.                                                                                                                                           | `minor`, `feature`  |
| `labels-major`\*      | Labels for pull requests to bump a major version.                                                                                                                                           | `major`, `breaking` |
| `label-ready`         | Label automatically used by Release Action for release PRs.                                                                                                                                 | `release: ready`    |
| `label-done`          | Label automatically used by Release Action for release PRs that have been processed (current version released).                                                                             | `release: done`     |
| `branch-production`   | Branch used for production, the base for all PRs going to production.                                                                                                                       | `main`              |
| `branch-release`      | Branch used for release PRs.                                                                                                                                                                | `releases/next`     |
| `skip-pr-creation`    | Skip release PR creation. When there are changes, if the PR exists, it will still be updated. if the PR doesn't exist but the release branch does, the later will still be updated as well. | `false`             |
| `keep-branch-updated` | Keep the release branch merged from main when the PR exists.                                                                                                                                | `false`             |

\*Multiple labels can be defined using a multiline block such as follow:

```yaml
labels-patch: |-
  "patch"
  "fix"
```

### Outputs

| Name              | Description                                |
| ----------------- | ------------------------------------------ |
| `current-version` | Version of the current code.               |
| `next-version`    | Version of the next release.               |
| `release-pr`      | Number of the opened release pull request. |
| `is-released`     | Current version has been released.         |
| `pre-release`     | Pre-release part of the current version.   |

### Secrets

_None._

### Environment variables

| Name           | Description                                 |
| -------------- | ------------------------------------------- |
| `GITHUB_TOKEN` | Authentification token used for GitHub API. |

### Examples

Execute another job when a release has been made:

```yaml
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    outputs:
      is-released: ${{ steps.action.outputs.is-released }}
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Execute action
        id: action
        uses: cyberspace7/release-action@v0.7.0
  publish:
    name: Publish
    needs: release
    if: needs.release.outputs.is-released == 'true'
    uses: ./.github/workflows/publish.yml
```

Only create release PRs and merge `main` into existing release PR when manually triggered:

```yaml
name: Release

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Execute action
        id: action
        uses: cyberspace7/release-action@v0.7.0
        with:
          skip-pr-creation: ${{ github.event_name != 'workflow_dispatch' }}
          keep-branch-updated: ${{ github.event_name == 'workflow_dispatch' }}
```

## Contributing

Submit a feature request or any idea to improve the project, as it is greatly appreciated,
in the [discussions](https://github.com/cyberspace7/release-action/discussions/categories/ideas).

If you find a bug concerning this project, please fill a [bug report](https://github.com/cyberspace7/release-action/issues/new?assignees=&labels=bug-report&projects=&template=bug-report.yml).
If it concerns a security vulnerability, please email us at `contact@a60.dev`.

For contributing, please check the [Contributing Guidelines](.github/CONTRIBUTING.md).

---

## Authors

- [**Benjamin Guibert**](https://github.com/benjamin-guibert) – main author and contributor.

## Licensing

This project is licensed under the [MIT License](LICENSE).
