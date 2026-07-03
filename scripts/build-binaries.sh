#!/usr/bin/env bash
#
# Cross-compile the DvalinCode CLI into standalone single-file binaries
# for macOS and Linux using Bun. No Node runtime required on the target machine.
#
# Usage:
#   scripts/build-binaries.sh            # build all targets
#   scripts/build-binaries.sh darwin     # build only macOS targets
#   scripts/build-binaries.sh linux      # build only Linux targets
#   TARGETS="bun-darwin-arm64" scripts/build-binaries.sh   # build one explicit target
#
# Output goes to dist-bin/ along with a SHA256SUMS.txt checksum file.

set -euo pipefail

# ── Locate bun (prefer ~/.bun/bin/bun, fall back to PATH) ──────────────
if command -v bun >/dev/null 2>&1; then
  BUN="$(command -v bun)"
elif [ -x "$HOME/.bun/bin/bun" ]; then
  BUN="$HOME/.bun/bin/bun"
else
  echo "error: bun is not installed." >&2
  echo "install it with: curl -fsSL https://bun.sh/install | bash" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENTRY="src/index.ts"
OUT_DIR="dist-bin"

# Read version from package.json (no jq dependency).
VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")"

# ── Target matrix: bun target  ->  output binary name ─────────────────
# Bun target triples map to friendly artifact names.
declare -a ALL_TARGETS=(
  "bun-darwin-arm64:dvalincode-macos-arm64"
  "bun-darwin-x64:dvalincode-macos-x64"
  "bun-linux-arm64:dvalincode-linux-arm64"
  "bun-linux-x64:dvalincode-linux-x64"
  "bun-windows-x64:dvalincode-windows-x64"
)

# ── Optional filter from args / env ───────────────────────────────────
FILTER="${1:-all}"
SELECTED=()

if [ -n "${TARGETS:-}" ]; then
  # Explicit TARGETS env: space-separated bun target triples.
  for t in $TARGETS; do
    for pair in "${ALL_TARGETS[@]}"; do
      if [ "${pair%%:*}" = "$t" ]; then
        SELECTED+=("$pair")
      fi
    done
  done
else
  for pair in "${ALL_TARGETS[@]}"; do
    case "$FILTER" in
      all)     SELECTED+=("$pair") ;;
      darwin)  [[ "$pair" == *darwin*  ]] && SELECTED+=("$pair") ;;
      linux)   [[ "$pair" == *linux*   ]] && SELECTED+=("$pair") ;;
      windows) [[ "$pair" == *windows* ]] && SELECTED+=("$pair") ;;
      *)       echo "error: unknown filter '$FILTER' (use: all | darwin | linux | windows)" >&2; exit 1 ;;
    esac
  done
fi

if [ "${#SELECTED[@]}" -eq 0 ]; then
  echo "error: no targets selected." >&2
  exit 1
fi

echo "DvalinCode binary build · v${VERSION}"
echo "bun: $($BUN --version) ($BUN)"
echo "entry: ${ENTRY}"
echo "output: ${OUT_DIR}/"
echo

echo "▶ updating third-party notices"
npm run notices:update >/dev/null
echo "  ✓ THIRD_PARTY_NOTICES.md"
echo

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

for pair in "${SELECTED[@]}"; do
  target="${pair%%:*}"
  name="${pair##*:}"
  outfile="${OUT_DIR}/${name}"

  echo "▶ building ${name}  (${target})"
  "$BUN" build "$ENTRY" \
    --compile \
    --minify \
    --target="$target" \
    --outfile "$outfile"

  # Bun appends .exe only for windows targets; mac/linux stay extensionless.
  chmod +x "$outfile" 2>/dev/null || true
  size="$(ls -lh "$outfile" | awk '{print $5}')"
  echo "  ✓ ${outfile} (${size})"
  echo
done

# ── Checksums ─────────────────────────────────────────────────────────
echo "▶ generating SHA256SUMS.txt"
(
  cd "$OUT_DIR"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 dvalincode-* > SHA256SUMS.txt
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum dvalincode-* > SHA256SUMS.txt
  else
    echo "  warning: no shasum/sha256sum found, skipping checksums" >&2
  fi
)

echo
echo "Done. Artifacts in ${OUT_DIR}/:"
cp LICENSE THIRD_PARTY_NOTICES.md "$OUT_DIR/"
ls -1 "$OUT_DIR"
