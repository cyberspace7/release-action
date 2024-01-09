import { SemVer } from "semver";
import { inputs } from "./inputs";
import type { PullRequest } from "./repository";

export function createNewVersion() {
  return new SemVer("0.0.0");
}

export function getVersionBumpLevel(
  pullRequests: PullRequest[],
  currentVersion: SemVer | null,
) {
  const isStable = (currentVersion?.major ?? 0) > 0;
  const releaseLabelNames = Object.values(inputs.releaseLabels);
  const bumpLevels = pullRequests.map((pullRequest) => {
    const bumpLabels = pullRequest.labels
      .filter((label) => {
        return releaseLabelNames.includes(label.name);
      })
      .map((label) => label.name);

    if (bumpLabels.includes(inputs.releaseLabels.ignore)) {
      return 0;
    }
    if (bumpLabels.includes(inputs.releaseLabels.major)) {
      return isStable ? 3 : 2;
    }
    if (bumpLabels.includes(inputs.releaseLabels.minor)) {
      return 2;
    }
    if (bumpLabels.includes(inputs.releaseLabels.patch)) {
      return 1;
    }

    return 0;
  });

  return Math.max(0, ...bumpLevels);
}

export function getNextVersion(
  currentVersion: SemVer | null,
  bumpLevel: number,
  preRelease?: string,
) {
  const version = currentVersion
    ? new SemVer(currentVersion.version)
    : createNewVersion();

  if (preRelease) {
    switch (bumpLevel) {
      case 0:
        return version.inc("prerelease", preRelease);
      case 1:
        return version.inc("prepatch", preRelease);
      case 2:
        return version.inc("preminor", preRelease);
      case 3:
        return version.inc("premajor", preRelease);
      default:
        throw new Error(`Invalid bump level: ${bumpLevel}.`);
    }
  }

  if (bumpLevel === 0) {
    return null;
  }

  switch (bumpLevel) {
    case 1:
      return version.inc("patch");
    case 2:
      return version.inc("minor");
    case 3:
      return version.inc("major");
    default:
      throw new Error(`Invalid bump level: ${bumpLevel}.`);
  }
}
