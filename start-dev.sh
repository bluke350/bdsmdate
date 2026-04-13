#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/home/wildbill/bdsmdate"
MOBILE_DIR="$ROOT_DIR/apps/mobile"
API_DIR="$ROOT_DIR/apps/api"

export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export PATH="$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/platform-tools:$PATH"

cd "$MOBILE_DIR"
npm install
npx expo start -c &
METRO_PID=$!

npm --prefix "$API_DIR" run dev &
API_PID=$!

emulator -avd bdsmdate_api_36 &
EMU_PID=$!

cat <<EOF

Started:
- Metro PID: $METRO_PID
- API PID: $API_PID
- Emulator PID: $EMU_PID

If Expo does not auto-open, use the Metro URL printed in the Metro terminal.
EOF

wait
