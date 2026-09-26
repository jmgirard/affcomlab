"""Build ring.json from pubs.json, taxonomy.json, and the areas.xlsx assignments."""
import json
from openpyxl import load_workbook

TAX = json.load(open('data/taxonomy.json', encoding='utf-8'))
pubs = json.load(open('data/pubs.json', encoding='utf-8'))
code = {v['subs'][s]: s for a, v in TAX.items() if a != 'desc' for s in v['subs']}
sub2area = {s: a for a, v in TAX.items() if a != 'desc' for s in v['subs']}

wb = load_workbook('data/areas.xlsx', data_only=True); ws = wb['Papers']
hdr = [c.value for c in ws[1]]
nodes, problems, excluded = [], [], []
for row in ws.iter_rows(min_row=2, values_only=True):
    r = dict(zip(hdr, row))
    if not r['Key']: continue
    p = pubs.get(r['Key'])
    if not p: problems.append(f"unknown key {r['Key']}"); continue
    subs = []
    for col in ('Area 1 (main)', 'Area 2', 'Area 3', 'Area 4'):
        v = (r.get(col) or '').strip()
        if not v: continue
        if v not in code: problems.append(f"{r['Key']}: unknown area '{v}'"); continue
        if code[v] not in subs: subs.append(code[v])
    if not subs: excluded.append(r['Key']); continue   # a blank main area leaves the paper off the ring on purpose
    nodes.append({'key': r['Key'], 'title': p['title'], 'year': p['year'], 'venue': p['venue'], 'primary': bool(p['primary']),
                  'doi': p['doi'], 'preprint': p['preprint'].replace('\\_', '_'), 'url': p['url'],
                  'subs': subs, 'areas': [sub2area[s] for s in subs]})
missing = [k for k in pubs if k not in {n['key'] for n in nodes} and k not in excluded]
if missing: problems.append(f"papers not in sheet: {missing}")
questions = []
if 'Questions' in wb.sheetnames:
    qs = wb['Questions']; qh = [c.value for c in qs[1]]
    for row in qs.iter_rows(min_row=2, values_only=True):
        q = dict(zip(qh, row))
        if not q.get('Question') or not q.get('Key'): continue
        if q['Key'] not in {n['key'] for n in nodes}: problems.append(f"question for unknown or excluded paper {q['Key']}"); continue
        questions.append((q.get('Order') or 999, q['Key'], str(q['Question']).strip()))
    questions = [{'key': k, 'text': t} for _, k, t in sorted(questions)]
json.dump({'taxonomy': TAX, 'nodes': nodes, 'questions': questions}, open('data/ring.json', 'w', encoding='utf-8'))
print(len(questions), 'questions')
print(len(nodes), 'papers;', sum(len(n['subs']) > 1 for n in nodes), 'with 2+ areas;', sum(len(n['subs']) > 2 for n in nodes), 'with 3+')
if excluded: print('excluded on purpose:', excluded)
for m in problems: print('PROBLEM:', m)
