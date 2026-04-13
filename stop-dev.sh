#!/usr/bin/env bash
set -euo pipefail

export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export PATH="$ANDROID_SDK_ROOT/platform-tools:$PATH"

adb emu kill || true
pkill -f "expo start" || true
pkill -f "tsx watch" || true

cat <<EOF
Stopped:
- Emulator
- Metro (expo)
- API (tsx watch)
EOF
