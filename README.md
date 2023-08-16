# Release Action

PR-based Github Action for releasing Node.js projects.

> :warning: **This project is still in experimental phase, it is subject to
> breaking changes and therefore not suitable for production.**

[Issues](https://github.com/cyberspace7/release-action/issues) can be tracked
[here](https://github.com/orgs/cyberspace7/projects/2), don't hesitate to upvote
issues you want to be treated.
If you have any question, remark, suggestion, ... They are most welcome in the
[discussions](https://github.com/cyberspace7/release-action/discussions)!

## Description

Release Action is a simple automation of the release of Node.js projects on GitHub based on pull requests and labels. You can easily integrate it in your workflow as it only makes a
GitHub release only when a specific PR is merged. It works in two phases:

1. **Prepare**: Gets all merged PRs since last release and determine the next version based
   on labels (major, minor, patch) unless overriden (see [inputs](#inputs)) and create
   (or update) a pull request including the updated `package.json` file;
2. **Release** (actually runs first): Once the release PR merged, a release is made on GitHub, that's it!

```mermaid
sequenceDiagram
  autonumber
  participant D as Developments
  participant M as Main Branch
  participant R as Release PR

  D ->> M: Merge PR #35;1 (fix)
  M -->> R: Open PR #35;2 (automatic)
  Note over M,R: Release v0.0.1
  D ->> M: Merge PR #35;3 (feature)
  M -->> R: Update PR #35;2 (automatic)
  Note over M,R: Release v0.1.0
  R ->> M: Merge
  Note over M: Release v0.1.0
```

Below is the prepare process when there are new changes:

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

## Why it should be used

It should be used if:

- Commits are systematically pushed to the main branch **through pull requests**;
- Labels are used in PRs to classify the type (patch, minor, major);
- Release commit is just about updating the `package.json` file.

## Why it should not be used

It should not be used if:

- Commits are **pushed directly** to the main branch;
- Release commit must include more than updating the `package.json` file,
  such as a changelog (changelog is generated in the PR body and GitHub release).

## Usage

Release Action is designed to be ran every time there is a change on the `main` branch.
Here is a recommended workflow setting:

```yaml
name: Release

on:
  push:
    branches:
      - main
  workflow_dispatch:
    inputs:
      release-as:
        type: string
        description: Force the release version
      pre-release:
        type: choice
        default: ""
        description: Pre-release
        options:
          - ""
          - alpha
          - beta
          - rc

permissions:
  contents: write
  pull-requests: write

env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      - name: Execute action
        id: action
        uses: cyberspace7/release-action@main
        with:
          release-as: ${{ inputs.release-as }}
          pre-release: ${{ inputs.pre-release }}
```

> :bulb: **Tip:** Use the `is-released` output (see [outputs](#outputs)) to execute
> another job to deploy the fresh release (i.e. create a package, deploy a Docker container,
> etc.).

When opening a PR on the `main` branch, use one (or more) of these labels in order to bump
the version to the right level:

- `type: fix`: Bump the path part of the version.
- `type: feature`: Bump the minor part of the version.
- `breaking`: Bump the major part of the version, or minor if current version is under `1.0`.
- `changelog-ignore`: Dont bump whatever other labels are. It should be excluded from
  the release notes generation (see bellow).

You want to be able to personalize those labels? Upvote or comment
[this issue](https://github.com/cyberspace7/release-action/issues/5).

That's it, when merged, you should find an open release PR. You just have to merge to merge it when you wish to release, voilà !

Changes are found comparing GitHub
[generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes),
therefore it's advised to have a `.github/release.yml` file excluding release PR labels and
the ignore label so that they don't appear as changes:

```yaml
changelog:
  exclude:
    labels:
      - "changelog-ignore"
      - "release: ready"
      - "release: done"
```

Something's missing? Check if it's planned in
[issues](https://github.com/cyberspace7/release-action/issues), upvote it, or share your
thoughts in the [discussions](https://github.com/cyberspace7/release-action/discussions).
Don't hesite also to share your experience.

### Permissions

This action requires the following permissions in order to work:

```yaml
permissions:
  contents: write
  pull-requests: write
```

### Inputs

- `release-as` (`string`): Force a specific version.
- `pre-release` (`string`): Name of the pre-release version (`alpha`, `beta`, `rc`...).
  If not empty, will trigger a pre-release.

### Outputs

- `current-version` (`string`): Version of the current code.
- `next-version` (`string`): Verion of the next release.
- `release-pr` (`number`): Number of the opened release pull request.
- `is-released` (`boolean`): Current version has been released.

### Secrets

_None._

### Environment variables

- `GITHUB_TOKEN`: Authentification token used for GitHub API.

## Development

See [`package.json`](package.json) for the list of available scripts.

### Prerequisites

This project require the following dependencies:

- [Node.js](https://nodejs.org)
- [pnpm](https://pnpm.io)

### Setup

Install the dependencies:

```bash
pnpm install
```

### Build

[Source files](src) are are compiled into a single file with all dependencies, into [`dist`](dist).
The `dist` directory must be commited into the repository.

```bash
pnpm build
```

### Release

Releases are automatic, following the merge of the release pull request (see [Release Action](https://github.com/cyberspace7/release-action#readme)).
A release PR can be explicitely generated by running manually
[this workflow](https://github.com/cyberspace7/release-action/actions/workflows/release.yml).

## Authors

- [**Benjamin Guibert**](https://github.com/benjamin-guibert) – main author and contributor.

## Contributing

Submit a feature request or any idea to improve the project, as it is greatly appreciated,
in the [discussions](https://github.com/cyberspace7/release-action/discussions/categories/ideas).

If you find a bug concerning this project, please fill a [bug report](https://github.com/cyberspace7/release-action/issues/new?assignees=&labels=bug-report&projects=&template=bug-report.yml).
If it concerns a security vulnerability, please email us at `contact@a60.dev`.

For contributing, please check the [guidelines](.github/CONTRIBUTING.md).

## Licensing

This project is licensed under the [MIT License](LICENSE).
