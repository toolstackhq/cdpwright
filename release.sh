#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 vX.Y.Z[-tag]" >&2
  exit 1
fi

INPUT_VERSION="$1"
VERSION="${INPUT_VERSION#v}"
TAG="v${VERSION}"

if [[ -z "${VERSION}" ]]; then
  echo "Invalid version: ${INPUT_VERSION}" >&2
  exit 1
fi

echo "Updating package version to ${VERSION}"
npm version "${VERSION}" --no-git-tag-version

echo "Committing version bump"
git add package.json package-lock.json
git commit -m "chore: release ${TAG}"

echo "Tagging ${TAG}"
git tag "${TAG}"

echo "Pushing commit and tag"
git push origin HEAD
git push origin "${TAG}"

echo "Done. CI will publish and generate release notes for ${TAG}."
