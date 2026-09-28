"""Draw the research framework (the temple) as img/framework.svg and wrap it in _framework.qmd for research.qmd.

Area names and colours come from data/taxonomy.json. Subareas and topics are listed in H below.
Rerun after editing either: python scripts/build_framework.py
"""
import json, os, math

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
tax = json.load(open('data/taxonomy.json', encoding='utf-8'))
C = {a: tax[a]['col'] for a in ['comm', 'mh', 'ip', 'meth', 'cs']}
NAME = {a: tax[a]['name'] for a in C}
# area -> [(subarea, [topics])]; the three substantive areas become columns, the two methods areas become foundation steps
H = {
 'comm': [('Verbal Behavior', ['Syntax', 'Semantics', 'Discourse']), ('Nonverbal Behavior', ['Facial expression', 'Vocal behavior', 'Gesture and motion'])],
 'ip': [('Interpersonal Dynamics', ['Change', 'Regulation', 'Influence']), ('Social Perception', ['Cultural context', 'Relational context', 'Situational context'])],
 'mh': [('Clinical Assessment', ['Symptoms', 'Diagnosis', 'Flourishing']), ('Clinical Mechanisms', ['Treatment process', 'Outcomes', 'Health behavior'])],
 'meth': [('Statistical Modeling', ['Bayesian estimation', 'Multilevel modeling', 'Simulation']), ('Research Practice', ['Measure validation', 'Reproducibility', 'Tutorials'])],
 'cs': [('Artificial Intelligence', ['Behavior sensing', 'Machine learning', 'Language models']), ('Open Resources', ['Research software', 'Research databases', 'Education resources'])],
}
INK = '#1c1a17'; MUTED = '#6d675f'; LINE = '#e2dbd0'; STONE = '#eae4d9'   # stone sits clearly darker than the paper background
W, Hh = 1000, 716
out = []


def T(x, y, s, cls, anchor='middle', fill=INK):
    out.append(f'<text x="{x:.1f}" y="{y:.1f}" class="{cls}" text-anchor="{anchor}" fill="{fill}">{s}</text>')


def mark(cx, cy, size):   # the ring mark, same geometry as img/favicon.svg
    r = 24 / 64 * size; sw = 9 / 64 * size; gap = 16; start = -110
    for i, a in enumerate(['comm', 'mh', 'ip', 'meth', 'cs']):
        s = start + i * 72 + gap / 2; e = s + 72 - gap
        x0, y0 = cx + r * math.cos(math.radians(s)), cy + r * math.sin(math.radians(s))
        x1, y1 = cx + r * math.cos(math.radians(e)), cy + r * math.sin(math.radians(e))
        out.append(f'<path d="M{x0:.1f} {y0:.1f}A{r:.1f} {r:.1f} 0 0 1 {x1:.1f} {y1:.1f}" stroke="{C[a]}" stroke-width="{sw:.1f}" fill="none"/>')


# pediment, with the mark and the title centred as one block (the title measures about 597 units wide at 30px)
out.append(f'<path d="M150 26 H850 L960 126 H40 Z" fill="{STONE}" stroke="#d9d1c4"/>')
title_w = 597; mark_w = 66; gap = 24
bx = 500 - (mark_w + gap + title_w) / 2
mark(bx + mark_w / 2, 76, mark_w)
T(bx + mark_w + gap, 63, 'RESEARCH FRAMEWORK', 'eyebrow', 'start', MUTED)
T(bx + mark_w + gap, 97, 'Affective and Interpersonal Communication', 'title', 'start')

# entablature: one bar per substantive area, spanning its two columns; then the columns themselves
cw, cg, m = 140, 12, 50
x = m
for a in ['comm', 'ip', 'mh']:
    x0 = x; x1 = x + 2 * cw + cg
    out.append(f'<rect x="{x0}" y="140" width="{x1 - x0}" height="30" fill="{C[a]}"/>')
    T((x0 + x1) / 2, 160, NAME[a].upper(), 'area', fill='#fff')
    for sub, topics in H[a]:
        cx0 = x
        out.append(f'<rect x="{cx0}" y="184" width="{cw}" height="290" fill="#fff" stroke="{LINE}"/>')
        out.append(f'<rect x="{cx0}" y="184" width="{cw}" height="7" fill="{C[a]}"/>')   # capital
        out.append(f'<rect x="{cx0}" y="467" width="{cw}" height="7" fill="{C[a]}"/>')   # base
        words = sub.split(' ')
        if len(words) > 1 and len(sub) > 14:   # two-line subarea name
            T(cx0 + cw / 2, 220, words[0], 'sub'); T(cx0 + cw / 2, 241, ' '.join(words[1:]), 'sub')
        else:
            T(cx0 + cw / 2, 231, sub, 'sub')
        ly = 262
        out.append(f'<line x1="{cx0 + 18}" y1="{ly}" x2="{cx0 + cw - 18}" y2="{ly}" stroke="{LINE}"/>')
        for k, t in enumerate(topics):
            ty = ly + 40 + k * 62
            T(cx0 + cw / 2, ty, t, 'topic', fill='#3d3833')
            if k < 2:
                out.append(f'<line x1="{cx0 + 44}" y1="{ty + 26}" x2="{cx0 + cw - 44}" y2="{ty + 26}" stroke="{LINE}"/>')
        x += cw + cg


def step(y, x0, x1, a, h=96):   # a foundation slab for one methods area, wider than the slab above it
    out.append(f'<rect x="{x0}" y="{y}" width="{x1 - x0}" height="{h}" fill="{STONE}" stroke="{LINE}"/>')
    out.append(f'<rect x="{x0}" y="{y}" width="8" height="{h}" fill="{C[a]}"/>')
    T(x0 + 28, y + 28, NAME[a].upper(), 'area', 'start', C[a])
    for (sub, topics), sx in zip(H[a], [x0 + 28, x0 + (x1 - x0) * 0.5 + 10]):
        T(sx, y + 56, sub, 'sub2', 'start')
        T(sx, y + 80, '  ·  '.join(topics), 'topic2', 'start', '#3d3833')


step(492, 40, 960, 'meth')
step(600, 20, 980, 'cs')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {Hh}" class="framework" role="img" aria-label="Research framework drawn as a temple: a pediment with the title, six columns for the six subareas grouped under three substantive areas, and two foundation steps for research methodology and computational tools">
<style>
  .framework .eyebrow {{ font: 600 12px "Source Sans 3", sans-serif; letter-spacing: .12em; }}
  .framework .title {{ font: 500 30px Fraunces, Georgia, serif; letter-spacing: -.01em; }}
  .framework .area {{ font: 700 12.5px "Source Sans 3", sans-serif; letter-spacing: .1em; }}
  .framework .sub {{ font: 600 16.5px Fraunces, Georgia, serif; }}
  .framework .sub2 {{ font: 600 16px Fraunces, Georgia, serif; }}
  .framework .topic, .framework .topic2 {{ font: 400 14px "Source Sans 3", sans-serif; }}
</style>
{chr(10).join(out)}
</svg>'''
open('img/framework.svg', 'w', encoding='utf-8', newline='\n').write(svg + '\n')
open('_framework.qmd', 'w', encoding='utf-8', newline='\n').write('```{=html}\n' + svg + '\n```\n')
print('wrote img/framework.svg and _framework.qmd')
