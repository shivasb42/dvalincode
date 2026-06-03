#!/usr/bin/env bash
# Build the DvalinCode GUI release:
#   1. Build the React frontend (web/dist/)
#   2. Compile server binaries for all platforms via Bun
#   3. Package each platform as an archive: binary + web/dist/
#   4. Generate SHA256SUMS.txt
#
# Usage:
#   scripts/build-release.sh             # all platforms
#   scripts/build-release.sh darwin      # macOS only
#   scripts/build-release.sh linux       # Linux only
#   scripts/build-release.sh windows     # Windows only

set -euo pipefail

# ── Bun ────────────────────────────────────────────────────────────────
if command -v bun >/dev/null 2>&1; then
  BUN="$(command -v bun)"
elif [ -x "$HOME/.bun/bin/bun" ]; then
  BUN="$HOME/.bun/bin/bun"
else
  echo "error: bun is not installed." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FILTER="${1:-all}"
VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")"
RELEASE_DIR="release"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  DvalinCode v${VERSION} — GUI Release Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# ── 1. Build web frontend ──────────────────────────────────────────────
echo "▶ Building web frontend…"
cd web && npm run build && cd "$ROOT_DIR"
echo "  ✓ web/dist/ ready"
echo

# ── 2. Platform matrix (parallel arrays — bash 3 compatible) ──────────
BUN_TARGETS=()
BIN_NAMES=()

add() {
  local bun_tgt="$1" bin_name="$2"
  case "$FILTER" in
    all)     BUN_TARGETS+=("$bun_tgt"); BIN_NAMES+=("$bin_name") ;;
    darwin)  [[ "$bun_tgt" == *darwin*  ]] && { BUN_TARGETS+=("$bun_tgt"); BIN_NAMES+=("$bin_name"); } ;;
    linux)   [[ "$bun_tgt" == *linux*   ]] && { BUN_TARGETS+=("$bun_tgt"); BIN_NAMES+=("$bin_name"); } ;;
    windows) [[ "$bun_tgt" == *windows* ]] && { BUN_TARGETS+=("$bun_tgt"); BIN_NAMES+=("$bin_name"); } ;;
    *) echo "error: unknown filter '$FILTER'" >&2; exit 1 ;;
  esac
}

add "bun-darwin-arm64"  "dvalincode-macos-arm64"
add "bun-darwin-x64"    "dvalincode-macos-x64"
add "bun-linux-arm64"   "dvalincode-linux-arm64"
add "bun-linux-x64"     "dvalincode-linux-x64"
add "bun-windows-x64"   "dvalincode-windows-x64"

if [ "${#BUN_TARGETS[@]}" -eq 0 ]; then
  echo "error: no targets for filter '$FILTER'" >&2; exit 1
fi

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR/tmp" "$RELEASE_DIR/pkg"

# ── 3. Compile + package each target ──────────────────────────────────
ENTRY="src/server/index.ts"

for i in "${!BUN_TARGETS[@]}"; do
  bun_target="${BUN_TARGETS[$i]}"
  bin_name="${BIN_NAMES[$i]}"

  is_windows=false
  [[ "$bun_target" == *windows* ]] && is_windows=true

  # Bun adds .exe only for Windows
  if $is_windows; then
    bin_file="${bin_name}.exe"
  else
    bin_file="${bin_name}"
  fi

  echo "▶ Compiling ${bin_file}  (${bun_target})"
  "$BUN" build "$ENTRY" \
    --compile \
    --minify \
    --target="$bun_target" \
    --outfile "${RELEASE_DIR}/tmp/${bin_file}"

  # ── Package ──────────────────────────────────────────────────────
  pkg_dir="${RELEASE_DIR}/pkg/${bin_name}"
  mkdir -p "${pkg_dir}/web"
  cp "${RELEASE_DIR}/tmp/${bin_file}" "${pkg_dir}/${bin_file}"
  cp -r web/dist "${pkg_dir}/web/dist"

  if $is_windows; then
    # Windows ZIP
    printf '@echo off\r\necho Starting DvalinCode...\r\n"%%~dp0dvalincode-windows-x64.exe"\r\n' \
      > "${pkg_dir}/start.bat"
    archive="${RELEASE_DIR}/dvalincode-v${VERSION}-windows-x64.zip"
    (cd "${RELEASE_DIR}/pkg" && zip -r "../dvalincode-v${VERSION}-windows-x64.zip" "${bin_name}" -x "*.DS_Store")
    echo "  ✓ dvalincode-v${VERSION}-windows-x64.zip  ($(du -sh "$archive" | cut -f1))"
  else
    # macOS / Linux tar.gz
    cat > "${pkg_dir}/start.sh" << 'SH'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN="$(ls "$DIR" | grep -Ev '(start\.sh|web)' | head -1)"
exec "$DIR/$BIN"
SH
    chmod +x "${pkg_dir}/start.sh"
    suffix="${bin_name#dvalincode-}"
    archive_name="dvalincode-v${VERSION}-${suffix}.tar.gz"
    (cd "${RELEASE_DIR}/pkg" && tar czf "../${archive_name}" "${bin_name}")
    echo "  ✓ ${archive_name}  ($(du -sh "${RELEASE_DIR}/${archive_name}" | cut -f1))"
  fi
  echo
done

rm -rf "${RELEASE_DIR}/tmp" "${RELEASE_DIR}/pkg"

# ── 4. Checksums ──────────────────────────────────────────────────────
echo "▶ Generating SHA256SUMS.txt"
(
  cd "$RELEASE_DIR"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 dvalincode-v* > SHA256SUMS.txt
  else
    sha256sum dvalincode-v* > SHA256SUMS.txt
  fi
)

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Artifacts in ${RELEASE_DIR}/:"
ls -1 "$RELEASE_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
