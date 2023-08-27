import { SemVer } from "semver";
import { inputs } from "./inputs";
import { PullRequest } from "./repository";

const { releaseLabels } = inputs;

export const createNewVersion = () => {
  return new SemVer("0.0.0");
};

export const getVersionBumpLevel = (
  pullRequests: PullRequest[],
  currentVersion: SemVer | null,
) => {
  const isStable = (currentVersion?.major ?? 0) > 0;
  const releaseLabelNames = Object.values(releaseLabels) as string[];
  const bumpLevels = pullRequests.map(({ labels }) => {
    const bumpLabels = labels
      .filter(({ name }) => {
        return releaseLabelNames.includes(name);
      })
      .map(({ name }) => name);

    if (bumpLabels.includes(releaseLabels.ignore)) {
      return 0;
    }
    if (bumpLabels.includes(releaseLabels.major)) {
      return isStable ? 3 : 2;
    }
    if (bumpLabels.includes(releaseLabels.minor)) {
      return 2;
    }
    if (bumpLabels.includes(releaseLabels.patch)) {
      return 1;
    }

    return 0;
  });

  return Math.max(0, ...bumpLevels);
};

export const getNextVersion = (
  currentVersion: SemVer | null,
  bumpLevel: number,
  preRelease?: string | undefined,
) => {
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
};
