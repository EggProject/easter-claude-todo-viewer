import copy, json, re

PROTECTED_PATTERNS=[
 ('fenced_code',re.compile(r'```[\s\S]*?```|~~~[\s\S]*?~~~')),
 ('inline_code',re.compile(r'`[^`\n]+`')),
 ('url',re.compile(r'https?://[^\s)\]>]+')),
 ('path',re.compile(r'(?<!\w)/(?:[^\s`]+/)*[^\s`]*')),
 ('issue',re.compile(r'\b[A-Z][A-Z0-9]+-\d+\b')),
 ('tech_id',re.compile(r'\b[A-Z]{1,10}\d+[A-Z0-9._-]*\b')),
 ('task_id',re.compile(r'(?<!\w)#\d+\b')),
 ('version',re.compile(r'\bv?\d+(?:\.\d+){1,3}(?:[-+][A-Za-z0-9._-]+)?\b')),
]
KEEP_RE=re.compile(r'<keep\s+id="([^"]+)"\s+kind="([^"]+)">([\s\S]*?)</keep>')

def _matches(text):
    items=[]
    for kind,pat in PROTECTED_PATTERNS:
        for m in pat.finditer(str(text or '')): items.append((m.start(),m.end(),m.group(0),kind))
    items.sort(key=lambda x:(x[0],-(x[1]-x[0]))); out=[]; cursor=-1
    for x in items:
        if x[0]<cursor: continue
        out.append(x); cursor=x[1]
    return out

def protect_source(source):
    protected={}; mapping={}
    for field in ('title','description'):
        text=str((source or {}).get(field,'')); chunks=[]; cursor=0; fieldmap={}
        for i,(s,e,literal,kind) in enumerate(_matches(text),1):
            ident=f'{field[0].upper()}{i:04d}'; chunks.append(text[cursor:s]); chunks.append(f'<keep id="{ident}" kind="{kind}">{literal}</keep>'); fieldmap[ident]={'literal':literal,'kind':kind};cursor=e
        chunks.append(text[cursor:]); protected[field]=''.join(chunks);mapping[field]=fieldmap
    return protected,mapping

def restore_protected_spans(candidate,mapping):
    restored={};issues=[]
    for field in ('title','description'):
        text=str((candidate or {}).get(field,'')); seen={}
        def repl(m):
            ident,kind,inner=m.group(1),m.group(2),m.group(3); seen[ident]=seen.get(ident,0)+1; exp=(mapping.get(field) or {}).get(ident)
            if not exp: issues.append(f'{field}: unexpected protected span {ident}'); return inner
            if kind!=exp['kind']: issues.append(f'{field}: protected span {ident} kind changed ({kind} != {exp["kind"]})')
            if inner!=exp['literal']: issues.append(f'{field}: protected span {ident} content changed: expected {exp["literal"]!r}, got {inner!r}')
            return exp['literal']
        text=KEEP_RE.sub(repl,text)
        for ident,exp in (mapping.get(field) or {}).items():
            if seen.get(ident,0)==0: issues.append(f'{field}: protected span missing: {ident} ({exp["literal"]})')
            elif seen.get(ident,0)>1: issues.append(f'{field}: protected span duplicated: {ident} ({exp["literal"]})')
        restored[field]=text
    return restored,issues

def markdown_shape(text):
    lines=str(text or '').splitlines(); items=[];in_fence=False
    for line in lines:
        s=line.lstrip(); indent=len(line)-len(s)
        if re.match(r'^(```|~~~)',s): items.append((indent,'fence'));in_fence=not in_fence;continue
        if in_fence: continue
        if not s: continue
        kind='paragraph'; marker=''
        for pat,k in [(r'^(#{1,6})\s+','heading'),(r'^[-*+]\s+\[[ xX]\]\s+','task-item'),(r'^[-*+]\s+','bullet'),(r'^\d+[.)]\s+','number'),(r'^>\s?','quote')]:
            m=re.match(pat,s)
            if m: kind=k;marker=m.group(0).strip();break
        entry=(indent,kind,marker if kind in ('heading','task-item') else '')
        # Physical wrapping of prose is not a Markdown structural change. Consecutive
        # plain-text lines at the same indentation form one paragraph block.
        if kind=='paragraph' and items:
            if items[-1][0]==indent and items[-1][1]=='paragraph':
                continue
            # Wrapped continuation lines inside a list/quote are prose continuation,
            # not a new Markdown block.
            if items[-1][1] in ('bullet','number','task-item','quote') and indent>=items[-1][0]:
                continue
        items.append(entry)
    return {'blocks':items,'fenceCount':sum(1 for _,k,*_ in items if k=='fence')}

def inline_shape(text):
    t=str(text or '')
    return {'bold':t.count('**')%2,'strike':t.count('~~')%2,'inlineCode':len(re.findall(r'`[^`\n]+`',t)),'links':len(re.findall(r'\[[^\]]+\]\([^)]+\)',t))}

def deterministic_translation_issues(source,candidate):
    issues=[]
    for field in ('title','description'):
        if markdown_shape(source.get(field,''))!=markdown_shape(candidate.get(field,'')):
            issues.append(f'{field}: Markdown structure changed')
        # inline code/links are already protected, but parity catches broken delimiters.
        a,b=inline_shape(source.get(field,'')),inline_shape(candidate.get(field,''))
        if a['bold']!=b['bold'] or a['strike']!=b['strike'] or a['links']!=b['links']:
            issues.append(f'{field}: inline Markdown structure changed')
    return issues

def render_prompt(template,variables):
    out=str(template)
    for k,v in variables.items(): out=re.sub(r'\{\{\s*'+re.escape(k)+r'\s*\}\}',str(v),out)
    return out
