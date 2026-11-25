#!/bin/sh
# SPDX-License-Identifier: MIT
#
# Install the `voidable` command-line tool from a GitHub release, without Go
# or Node and without sudo.
#
#   curl -fsSL https://voidable.dev/install.sh | sh
#   curl -fsSL https://voidable.dev/install.sh | sh -s -- --version X.Y.Z --dir ~/bin
#
# Options (or the environment variable in brackets):
#   -v, --version X.Y.Z   release to install, default the latest  [VOIDABLE_VERSION]
#   -d, --dir DIR         where to put the binary, default ~/.local/bin  [VOIDABLE_INSTALL_DIR]
#   -h, --help
#
# What it does: detects your OS and CPU, downloads voidable_<os>_<arch>.tar.gz
# and checksums.txt from the release, refuses to continue unless the archive's
# SHA-256 is the one in checksums.txt, then copies the binary into DIR. Nothing
# else on the machine is touched. Provenance can be checked afterwards with
#   gh attestation verify <archive> --repo VoidableUI/Voidable
#
# For tests: VOIDABLE_RELEASES_URL replaces https://github.com/VoidableUI/Voidable/releases,
# VOIDABLE_OS and VOIDABLE_ARCH replace the detected platform.
set -eu

RELEASES_URL="${VOIDABLE_RELEASES_URL:-https://github.com/VoidableUI/Voidable/releases}"
VERSION="${VOIDABLE_VERSION:-}"
DIR="${VOIDABLE_INSTALL_DIR:-}"

say() { printf '%s\n' "$*"; }
die() { printf 'install.sh: %s\n' "$*" >&2; exit 1; }

usage() {
  say "Install the voidable command-line tool from a GitHub release."
  say "  -v, --version X.Y.Z   release to install (default: the latest)   [VOIDABLE_VERSION]"
  say "  -d, --dir DIR         where to put the binary (default: ~/.local/bin)   [VOIDABLE_INSTALL_DIR]"
  say "  -h, --help"
}

while [ $# -gt 0 ]; do
  case "$1" in
    -v|--version) [ $# -ge 2 ] || die "$1 needs a value"; VERSION="$2"; shift 2 ;;
    -d|--dir) [ $# -ge 2 ] || die "$1 needs a value"; DIR="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option $1 (try --help)" ;;
  esac
done

[ -n "$DIR" ] || { [ -n "${HOME:-}" ] || die "HOME is not set; pass --dir"; DIR="$HOME/.local/bin"; }
VERSION="${VERSION#v}"
case "$VERSION" in
  ""|[0-9]*.[0-9]*.[0-9]*) ;;
  *) die "not a version: $VERSION (expected X.Y.Z)" ;;
esac

os="${VOIDABLE_OS:-$(uname -s)}"
case "$os" in
  Linux|linux) os=linux ;;
  Darwin|darwin) os=darwin ;;
  *) die "unsupported OS $os; on Windows download the .zip from $RELEASES_URL" ;;
esac
arch="${VOIDABLE_ARCH:-$(uname -m)}"
case "$arch" in
  x86_64|amd64) arch=amd64 ;;
  aarch64|arm64) arch=arm64 ;;
  *) die "unsupported CPU $arch (releases exist for amd64 and arm64)" ;;
esac

if [ -n "$VERSION" ]; then
  base="$RELEASES_URL/download/v$VERSION"
  label="v$VERSION"
else
  base="$RELEASES_URL/latest/download"
  label="the latest release"
fi
archive="voidable_${os}_${arch}.tar.gz"

if command -v curl >/dev/null 2>&1; then
  fetch() { curl -fsSL --retry 2 -o "$2" "$1"; }
elif command -v wget >/dev/null 2>&1; then
  fetch() { wget -q -O "$2" "$1"; }
else
  die "need curl or wget"
fi

if command -v sha256sum >/dev/null 2>&1; then
  hash_of() { sha256sum "$1" | cut -d' ' -f1; }
elif command -v shasum >/dev/null 2>&1; then
  hash_of() { shasum -a 256 "$1" | cut -d' ' -f1; }
elif command -v openssl >/dev/null 2>&1; then
  hash_of() { openssl dgst -sha256 "$1" | sed 's/^.*= //'; }
else
  die "need sha256sum, shasum or openssl to verify the download"
fi

tmp="$(mktemp -d 2>/dev/null || mktemp -d -t voidable)"
trap 'rm -rf "$tmp"' EXIT INT TERM

say "Downloading $archive from $label ($os/$arch)"
fetch "$base/$archive" "$tmp/$archive" || die "could not download $base/$archive"
fetch "$base/checksums.txt" "$tmp/checksums.txt" || die "could not download $base/checksums.txt"

want="$(awk -v f="$archive" '$2 == f || $2 == "*" f { print $1; exit }' "$tmp/checksums.txt")"
[ -n "$want" ] || die "checksums.txt has no entry for $archive"
got="$(hash_of "$tmp/$archive")"
if [ "$got" != "$want" ]; then
  die "checksum mismatch for $archive: expected $want, got $got; nothing was installed"
fi
say "Checksum verified (sha256 $got)"

mkdir "$tmp/x"
tar -xzf "$tmp/$archive" -C "$tmp/x" || die "could not unpack $archive"
bin="$(find "$tmp/x" -type f -name voidable | head -n 1)"
[ -n "$bin" ] || die "the archive holds no voidable binary"

mkdir -p "$DIR" || die "cannot create $DIR"
# Copy beside the target and rename, so a running voidable is replaced atomically.
if ! { cp "$bin" "$DIR/.voidable.$$" && chmod 755 "$DIR/.voidable.$$" && mv -f "$DIR/.voidable.$$" "$DIR/voidable"; }; then
  rm -f "$DIR/.voidable.$$"
  die "cannot write $DIR/voidable"
fi

say "Installed $DIR/voidable"
"$DIR/voidable" version | sed 's/^/  /' || true
case ":${PATH:-}:" in
  *":$DIR:"*) ;;
  *) say "Note: $DIR is not on your PATH. Add it, for example:  export PATH=\"$DIR:\$PATH\"" ;;
esac
