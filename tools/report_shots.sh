#!/bin/bash
# Capture hero screenshots for the morning report at 2x into report/out/shots/
set -e
cd "$(dirname "$0")/.."
O=qa/out-report
mkdir -p "$O" report/out/shots
CLEAN=1 DPR=2 OUT=$O W=1440 H=900 THEME=light node qa/shot.js today pipeline >/dev/null
CLEAN=1 DPR=2 OUT=$O W=1440 H=900 THEME=dark node qa/shot.js find >/dev/null
CLEAN=1 DPR=2 OUT=$O W=1440 H=900 THEME=light ACTIONS=qa/actions-find.js node qa/shot.js find:ghostTop >/dev/null || CLEAN=1 DPR=2 OUT=$O W=1440 H=900 THEME=light ACTIONS=qa/actions-find.js node qa/shot.js find:openFirstJob >/dev/null
CLEAN=1 DPR=2 OUT=$O W=375 H=812 THEME=light node qa/shot.js today pipeline >/dev/null
CLEAN=1 DPR=2 OUT=$O W=375 H=812 THEME=dark node qa/shot.js find prep >/dev/null
cp $O/today-1440-light.png report/out/shots/today-light.png
cp $O/find-1440-dark.png report/out/shots/find-dark.png
cp "$(ls -t $O/find-ghostTop-1440-light.png $O/find-openFirstJob-1440-light.png 2>/dev/null | head -1)" report/out/shots/job-light.png
cp $O/pipeline-1440-light.png report/out/shots/pipeline-light.png
cp $O/today-375-light.png report/out/shots/m-today-light.png
cp $O/find-375-dark.png report/out/shots/m-find-dark.png
cp $O/pipeline-375-light.png report/out/shots/m-pipeline-light.png
cp $O/prep-375-dark.png report/out/shots/m-prep-dark.png
ls -la report/out/shots
