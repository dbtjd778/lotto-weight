import fs from 'node:fs'
import path from 'node:path'

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/** 위에서 본 지도: 벽(회색), 봇 경로(파랑), 이벤트 지점(초록), 끼임·구조(노랑/빨강) */
function mapSvg(scene, m, trail = [], issues = []) {
  const xs = m.colliders.flatMap((c) => [c[0], c[2]]).concat(trail.map((p) => p[0]))
  const zs = m.colliders.flatMap((c) => [c[1], c[3]]).concat(trail.map((p) => p[1]))
  // 동네의 바깥 경계 벽은 1m 두께로 멀리 있으니 그대로 포함해도 된다
  const minX = Math.min(...xs) - 1
  const maxX = Math.max(...xs) + 1
  const minZ = Math.min(...zs) - 1
  const maxZ = Math.max(...zs) + 1
  const W = 720
  const s = W / (maxX - minX)
  const H = Math.max(160, (maxZ - minZ) * s)
  const X = (x) => ((x - minX) * s).toFixed(1)
  const Z = (z) => ((z - minZ) * s).toFixed(1)
  const rects = m.colliders
    .map((c) => `<rect x="${X(c[0])}" y="${Z(c[1])}" width="${((c[2] - c[0]) * s).toFixed(1)}" height="${((c[3] - c[1]) * s).toFixed(1)}" class="wall"/>`)
    .join('')
  const line = trail.length ? `<polyline class="trail" points="${trail.map((p) => `${X(p[0])},${Z(p[1])}`).join(' ')}"/>` : ''
  const spots = Object.entries(m.spots)
    .map(([k, [x, z]]) => `<circle cx="${X(x)}" cy="${Z(z)}" r="5" class="spot"/><text x="${X(x)}" y="${Z(z) - 8}" class="lbl">${esc(k)}</text>`)
    .join('')
  const marks = issues
    .filter((i) => i.scene === scene && i.at)
    .map((i) => `<circle cx="${X(i.at[0])}" cy="${Z(i.at[1])}" r="9" class="${i.level === '문제' ? 'bad' : 'warn'}"><title>${esc(i.msg)}</title></circle>`)
    .join('')
  return `<svg viewBox="0 0 ${W} ${H.toFixed(0)}" width="100%">${rects}${line}${spots}${marks}</svg>`
}

export function writeReport(r, outDir) {
  const by = (lvl) => r.issues.filter((i) => i.level === lvl)
  const walkBySpot = {}
  for (const w of r.walks) (walkBySpot[`${w.scene}/${w.spot}`] ??= []).push(w.secs)
  const walkRows = Object.entries(walkBySpot)
    .map(([k, v]) => [k, v.length, v.reduce((a, b) => a + b, 0) / v.length, Math.max(...v)])
    .sort((a, b) => b[2] - a[2])
  const fpsBy = {}
  for (const f of r.fps) (fpsBy[f.scene] ??= []).push(f.fps)
  const totalWalk = r.walks.reduce((a, w) => a + w.secs, 0)

  const issueList = (lvl) =>
    by(lvl).length
      ? `<ul>${by(lvl)
          .map((i) => `<li><b>${esc(i.kind)}</b> · ${esc(i.msg)} <span class="t">${i.t.toFixed(0)}s</span>${i.shot ? ` <a href="${i.shot}">스크린샷</a>` : ''}</li>`)
          .join('')}</ul>`
      : '<p class="none">없음</p>'

  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>플레이테스트 · ${esc(r.label)}</title>
<style>
:root{--bg:#faf9f6;--fg:#1c1917;--mut:#78716c;--line:#e7e5e4;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#141210;--fg:#f5f5f4;--mut:#a8a29e;--line:#292524;--card:#1c1917}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 -apple-system,'Apple SD Gothic Neo',sans-serif}
main{max-width:860px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:32px 0 8px}
.sub{color:var(--mut);font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.card b{display:block;font-size:20px}.card span{color:var(--mut);font-size:12px}
.bad b{color:#dc2626}.ok b{color:#16a34a}
ul{padding-left:18px}li{margin:4px 0}.t{color:var(--mut);font-size:12px}.none{color:var(--mut)}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left}
svg{background:var(--card);border:1px solid var(--line);border-radius:10px;margin:6px 0 18px}
.wall{fill:#a8a29e;opacity:.55}.trail{fill:none;stroke:#2563eb;stroke-width:1.6;opacity:.75}
.spot{fill:#16a34a}.lbl{font-size:10px;fill:var(--mut)}.warn{fill:#facc15;opacity:.6}.bad{fill:#dc2626;opacity:.6}
details{margin:8px 0}summary{cursor:pointer;color:var(--mut)}
img{max-width:100%;border-radius:8px;border:1px solid var(--line)}
.log{font:12px/1.5 ui-monospace,monospace;white-space:pre-wrap;color:var(--mut)}
</style></head><body><main>
<h1>자동 플레이테스트 · ${esc(r.label)}</h1>
<div class="sub">${new Date().toLocaleString('ko-KR')} · seed ${r.seed} · ${r.minutes.toFixed(1)}분 · 읽기 속도 ×${r.opts.readSpeed}</div>
<div class="grid">
<div class="card ${r.ending ? 'ok' : 'bad'}"><b>${esc(r.ending ?? '미완')}</b><span>엔딩</span></div>
<div class="card ${by('문제').length ? 'bad' : 'ok'}"><b>${by('문제').length}</b><span>문제</span></div>
<div class="card"><b>${by('주의').length}</b><span>주의</span></div>
<div class="card"><b>${r.events}</b><span>겪은 이벤트</span></div>
<div class="card"><b>${(totalWalk / 60).toFixed(1)}분</b><span>걷는 데 쓴 시간</span></div>
<div class="card"><b>${r.fps.length ? Math.round(r.fps.reduce((a, f) => a + f.fps, 0) / r.fps.length) : '-'}</b><span>평균 FPS</span></div>
</div>
<h2>문제</h2>${issueList('문제')}
<h2>주의</h2>${issueList('주의')}
<h2>참고</h2>${issueList('참고')}
<h2>지점별 걷는 시간</h2>
<table><tr><th>장소/지점</th><th>횟수</th><th>평균</th><th>최대</th></tr>
${walkRows.map(([k, n, avg, mx]) => `<tr><td>${esc(k)}</td><td>${n}</td><td>${avg.toFixed(1)}s</td><td>${mx.toFixed(1)}s</td></tr>`).join('')}
</table>
<h2>장소별 FPS</h2>
<table>${Object.entries(fpsBy).map(([k, v]) => `<tr><td>${esc(k)}</td><td>평균 ${Math.round(v.reduce((a, b) => a + b, 0) / v.length)} · 최저 ${Math.round(Math.min(...v))}</td></tr>`).join('')}</table>
<h2>위에서 본 지도</h2>
<div class="sub">파랑: 봇이 걸은 길 · 초록: 이벤트 지점 · 노랑/빨강: 끼임·구조</div>
${Object.entries(r.maps).map(([scene, m]) => `<h3>${esc(scene)}</h3>${mapSvg(scene, m, r.trails[scene], r.issues)}`).join('')}
${r.mobile ? `<h2>모바일 화면 (390×844)</h2><p>${r.mobile.problems.length ? esc(r.mobile.problems.join(' · ')) : '겹침·넘침 없음'}</p><img src="${r.mobile.shot}" style="max-width:260px">` : ''}
<h2>스크린샷</h2>
<details><summary>${r.shots.length}장</summary>${r.shots.map((s) => `<p>${esc(s)}<br><img src="${s}" loading="lazy"></p>`).join('')}</details>
<h2>선택 기록</h2>
<details><summary>${r.choices.length}번 선택</summary><div class="log">${r.choices.map((c) => `D+${c.day} ${esc(c.eventId)} → ${esc(c.choice)}`).join('\n')}</div></details>
<h2>진행 기록</h2>
<details><summary>${r.log.length}줄</summary><div class="log">${r.log.map((l) => `${l.t.toFixed(0).padStart(5)}s  ${esc(l.msg)}`).join('\n')}</div></details>
</main></body></html>`
  fs.writeFileSync(path.join(outDir, 'report.html'), html)
}
