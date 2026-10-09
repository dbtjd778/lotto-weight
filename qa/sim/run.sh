#!/bin/sh
# 사용법: qa/sim/run.sh [--persona casual|explorer|rusher] [--headed] ... (자세한 내용은 qa/sim/README.md)
DIR=$(cd "$(dirname "$0")" && pwd)
cd "$DIR/../.."
if ! command -v node >/dev/null 2>&1; then echo "Node.js를 찾을 수 없습니다. https://nodejs.org 에서 설치하세요."; exit 2; fi
[ -d node_modules/playwright ] || npm install
if [ "$1" = "--install" ]; then exec npx playwright install chromium; fi
# 실행 중 화면이 꺼지면 브라우저 렌더링이 멈추므로 맥에서는 잠자기를 막는다
if command -v caffeinate >/dev/null 2>&1; then exec caffeinate -dis node "$DIR/play.mjs" "$@"; fi
exec node "$DIR/play.mjs" "$@"
