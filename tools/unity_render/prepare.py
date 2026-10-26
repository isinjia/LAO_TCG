# 원작 Unity 프로젝트에서 지정한 2D 모델 프리팹과 그 의존 파일만 임시 Unity 프로젝트로 복사한다.
# 사용법: python tools/unity_render/prepare.py <임시프로젝트경로> <카드id ...>
import os, re, sys, json, shutil
SRC = 'E:/LAO_Google_QA'
A = SRC + '/Assets'
HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(HERE, 'guid_index.json')
TEXT_EXT = ('.prefab', '.mat', '.controller', '.anim', '.asset', '.overrideController', '.shader', '.cginc', '.mask')

def build_index():
    idx = {}
    for root, dirs, files in os.walk(A):
        for f in files:
            if not f.endswith('.meta'): continue
            p = os.path.join(root, f)
            try:
                with open(p, encoding='utf-8', errors='ignore') as fh:
                    for line in fh:
                        if line.startswith('guid:'):
                            idx[line.split()[1]] = os.path.relpath(p[:-5], A).replace(os.sep, '/'); break
            except OSError: pass
    json.dump(idx, open(INDEX, 'w'))
    return idx

def main():
    tmp, ids = sys.argv[1], sys.argv[2:]
    idx = json.load(open(INDEX)) if os.path.exists(INDEX) else build_index()
    todo, done = [], set()
    lines = []
    for cid in ids:
        rel = f'AssetBundleResource/Character_2D/2DModel_{cid}_N.prefab'
        if not os.path.exists(os.path.join(A, rel)): print('NO PREFAB', cid); continue
        todo.append(rel)
        lines.append(f'Assets/{rel}|{tmp}/out/{cid}.png')
    while todo:
        rel = todo.pop()
        if rel in done: continue
        done.add(rel)
        src = os.path.join(A, rel)
        if os.path.isdir(src): continue
        if rel.endswith('.cs') or rel.endswith('.dll'): continue
        dst = os.path.join(tmp, 'Assets', rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
        if os.path.exists(src + '.meta'): shutil.copy2(src + '.meta', dst + '.meta')
        if rel.endswith(TEXT_EXT):
            txt = open(src, encoding='utf-8', errors='ignore').read()
            for g in set(re.findall(r'guid: ([0-9a-f]{32})', txt)):
                if g in idx: todo.append(idx[g])
    # 상위 폴더 .meta도 복사 (GUID 유지)
    for rel in list(done):
        parts = rel.split('/')
        for i in range(1, len(parts)):
            d = '/'.join(parts[:i])
            m = os.path.join(A, d + '.meta')
            if os.path.exists(m):
                dm = os.path.join(tmp, 'Assets', d + '.meta')
                if not os.path.exists(dm) and os.path.isdir(os.path.dirname(dm)): shutil.copy2(m, dm)
    os.makedirs(os.path.join(tmp, 'ProjectSettings'), exist_ok=True)
    shutil.copy2(SRC + '/ProjectSettings/TagManager.asset', os.path.join(tmp, 'ProjectSettings/TagManager.asset'))
    os.makedirs(os.path.join(tmp, 'Assets/Editor'), exist_ok=True)
    shutil.copy2(os.path.join(HERE, 'LaoRender.cs'), os.path.join(tmp, 'Assets/Editor/LaoRender.cs'))
    open(os.path.join(tmp, 'list.txt'), 'w', encoding='utf-8').write('\n'.join(lines))
    print(f'{len(lines)} prefabs, {len(done)} files copied')

main()
