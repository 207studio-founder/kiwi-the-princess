#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
pets_dir=${CODEX_PETS_DIR:-"$HOME/.codex/pets"}
target="$pets_dir/kiwi-clay-r4"
timestamp=$(date +%Y%m%d-%H%M%S)
backup_dir="$(dirname "$pets_dir")/pet-backups"
backup="$backup_dir/kiwi-clay-r4-$timestamp-$$"
stage="$pets_dir/.kiwi-clay-r4.install-$$"
previous="$pets_dir/.kiwi-clay-r4.previous-$$"
archive="$script_dir/releases/kiwi-native-pet.zip"

cleanup() {
  rm -rf "$stage"
  if [ ! -e "$target" ] && [ -d "$previous" ]; then
    mv "$previous" "$target"
  fi
}
trap cleanup EXIT HUP INT TERM

command -v unzip >/dev/null 2>&1 || { printf '%s\n' 'unzip is required.' >&2; exit 1; }
mkdir -p "$pets_dir"
mkdir -p "$backup_dir"
mkdir "$stage"
unzip -q "$archive" -d "$stage"
test -s "$stage/pet.json"
test -s "$stage/spritesheet.webp"
grep -q '"id": "kiwi-clay-r4"' "$stage/pet.json"
grep -q '"displayName": "키위 · 클레이"' "$stage/pet.json"

if [ -e "$target" ]; then
  cp -a "$target" "$backup"
  mv "$target" "$previous"
fi
mv "$stage" "$target"
rm -rf "$previous"
trap - EXIT HUP INT TERM
printf 'Installed %s\n' "$target"
if [ -e "$backup" ]; then
  printf 'Previous installation copied to %s\n' "$backup"
fi
