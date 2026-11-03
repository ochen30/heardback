#!/bin/bash
# Runs every e2e script at 1440/375 with and without MOCK against $DIST (default: qa/e2e/out2/dist snapshot, else dist/).
# Results/logs/screens: $E2E_OUT (default qa/e2e/out2)/res-*.json, log-*.txt
cd "$(dirname "$0")/../.."
export E2E_OUT=${E2E_OUT:-qa/e2e/out2}
mkdir -p "$E2E_OUT"; rm -f "$E2E_OUT"/res-*.json
TESTS=${TESTS:-"t1-onboarding t2-find t3-pipeline t5-email t6-today t7-prep-stats t9-settings t10-palette t11-robust t13-bulk t14-new t15-keys"}
for t in $TESTS; do
  [ -f qa/e2e/$t.js ] || continue
  for w in 1440 375; do for m in 0 1; do echo "$t $w $m"; done; done
done | xargs -P ${PAR:-6} -L 1 bash -c 'if [ "$2" = 1 ]; then export MOCK=1; sfx=-mock; else unset MOCK; sfx=; fi; W=$1 timeout 300 node qa/e2e/$0.js > $E2E_OUT/log-$0-$1$sfx.txt 2>&1'
[ -f qa/e2e/t12-a11y.js ] && W=1440 node qa/e2e/t12-a11y.js > $E2E_OUT/log-t12-a11y.txt 2>&1
node -e "const fs=require('fs');const d=process.env.E2E_OUT;let all=[];for(const f of fs.readdirSync(d))if(f.startsWith('res-'))all=all.concat(JSON.parse(fs.readFileSync(d+'/'+f)));const fail=all.filter(r=>r.ok===false);console.log('checks',all.filter(r=>r.ok!=null).length,'pass',all.filter(r=>r.ok).length,'fail',fail.length);for(const r of fail)console.log('FAIL',r.area,'|',r.name,'|',r.detail.slice(0,200));"
