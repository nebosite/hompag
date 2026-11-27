#!/bin/sh
# hompag installer for macOS and Linux
#
# Quick install (latest release, guided):
#   curl -fsSL https://raw.githubusercontent.com/nebosite/hompag/master/install.sh | sh
#
# With options (see "hompag help" for all of them):
#   curl -fsSL https://raw.githubusercontent.com/nebosite/hompag/master/install.sh | sh -s -- --mode dev
#
# From a local checkout (no download):
#   ./install.sh --from-source .
#
# This script only finds Node.js and fetches the launcher (hompag.mjs); the
# launcher does the real work and is the same on every OS.
set -eu

REPO="nebosite/hompag"
MIN_NODE=20

say() { printf '%s\n' "$*"; }

node_advice() {
    case "$(uname -s)" in
        Darwin) say "Install it with 'brew install node' or from https://nodejs.org" ;;
        *)      say "Install it with your package manager, nvm (https://github.com/nvm-sh/nvm), or from https://nodejs.org" ;;
    esac
}

# --- Node.js ---------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
    say "hompag needs Node.js $MIN_NODE or newer, and it isn't installed."
    node_advice
    exit 1
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt "$MIN_NODE" ]; then
    say "hompag needs Node.js $MIN_NODE or newer; you have $(node -v)."
    node_advice
    exit 1
fi

# --- The launcher ----------------------------------------------------------------
LAUNCHER=""
PREV=""
for arg in "$@"; do
    if [ "$PREV" = "--from-source" ]; then LAUNCHER="$arg/release/hompag.mjs"; fi
    PREV="$arg"
done

if [ -n "$LAUNCHER" ]; then
    if [ ! -f "$LAUNCHER" ]; then
        say "No packaged release found at $LAUNCHER. Build one first:"
        say "  node build-all.js && node scripts/package-release.mjs"
        exit 1
    fi
else
    TEMP=$(mktemp -d 2>/dev/null || mktemp -d -t hompag)
    trap 'rm -rf "$TEMP"' EXIT
    LAUNCHER="$TEMP/hompag.mjs"
    BASE="https://github.com/$REPO/releases/latest/download"

    fetch() {
        if command -v curl >/dev/null 2>&1; then curl -fsSL "$1" -o "$2"
        elif command -v wget >/dev/null 2>&1; then wget -q "$1" -O "$2"
        else say "Please install curl or wget."; exit 1
        fi
    }

    say "Downloading the hompag launcher..."
    if ! fetch "$BASE/hompag.mjs" "$LAUNCHER" || ! fetch "$BASE/SHA256SUMS" "$TEMP/SHA256SUMS"; then
        say "Could not download the launcher from $BASE."
        say "If no release has been published yet, install from source instead:"
        say "  git clone https://github.com/$REPO.git && cd hompag"
        say "  node build-all.js && node launcher/dist/hompag.mjs install --mode dev --repo-dir ."
        exit 1
    fi

    EXPECTED=$(grep 'hompag\.mjs$' "$TEMP/SHA256SUMS" | awk '{print $1}')
    if command -v sha256sum >/dev/null 2>&1; then ACTUAL=$(sha256sum "$LAUNCHER" | awk '{print $1}')
    else ACTUAL=$(shasum -a 256 "$LAUNCHER" | awk '{print $1}')
    fi
    if [ -z "$EXPECTED" ] || [ "$EXPECTED" != "$ACTUAL" ]; then
        say "The downloaded launcher failed its checksum check. Please try again."
        exit 1
    fi
fi

# --- Hand off ----------------------------------------------------------------------
# When piped from curl, stdin is the script itself; reattach the terminal so the
# installer can ask questions.
if [ ! -t 0 ] && [ -r /dev/tty ] && (exec </dev/tty) 2>/dev/null; then
    node "$LAUNCHER" install "$@" </dev/tty
else
    node "$LAUNCHER" install "$@"
fi
