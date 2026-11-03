#!/bin/bash
# Runs every e2e script at 1440/375 with and without MOCK against $DIST (default dist/). Results: qa/e2e/out/res-*.json
cd "$(dirname "$0")/../.."
rm -f qa/e2e/out/res-*.json
jobs=()
for t in t1-onboarding t2-find t3-pipeline t5-email t6-today t7-prep-stats t9-settings t10-palette t11-robust; do
  [ -f qa/e2e/$t.js ] || continue
  for w in 1440 375; do for m in 0 1; do echo "$t $w $m"; done; done
done | xargs -P 6 -L 1 bash -c 'if [ "$2" = 1 ]; then export MOCK=1; sfx=-mock; else unset MOCK; sfx=; fi; W=$1 node qa/e2e/$0.js > qa/e2e/out/log-$0-$1$sfx.txt 2>&1'
node -e "const fs=require('fs');const d='qa/e2e/out';let all=[];for(const f of fs.readdirSync(d))if(f.startsWith('res-'))all=all.concat(JSON.parse(fs.readFileSync(d+'/'+f)));const fail=all.filter(r=>r.ok===false);console.log('checks',all.filter(r=>r.ok!=null).length,'pass',all.filter(r=>r.ok).length,'fail',fail.length);for(const r of fail)console.log('FAIL',r.area,'|',r.name,'|',r.detail.slice(0,200));"
