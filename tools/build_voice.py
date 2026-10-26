# 원작 캐릭터 음성에서 카드마다 대사 3종(배치·MVP·대기)을 골라 작게 줄여 assets/voice에 넣는다.
# python tools/build_voice.py
# 출력: assets/voice/<카드 id>_<종류>.mp3, js/voice_list.js (있는 음성 목록)
import re
from pathlib import Path
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
SRC = Path('E:/LAO_Google_QA/Assets/AssetBundleResource/Sounds/Voice')
OUT = ROOT / 'assets' / 'voice'
# 게임 안 종류 → 원작 음성 이름 후보 (앞에서부터 있는 것)
KINDS = {
    'deploy': ['BattleFocus', 'SortiePick', 'StageStart'],
    'mvp': ['MVP'],
    'idle': ['Idle_01_01', 'Idle_02_01'],
}


def main():
    ids = re.findall(r"\{ id: '([^']+)', n: '[^']+', f: '\w+', t: '", (ROOT / 'js' / 'data.js').read_text(encoding='utf-8'))
    files = {}
    for p in SRC.rglob('Voice_*.mp3'):
        # 기본 복장 폴더(이름에 NS·MR이 없는 폴더)의 파일을 우선한다
        if p.name not in files or not re.search(r'(NS\d|MR)$', p.parent.name):
            files[p.name] = p
    OUT.mkdir(parents=True, exist_ok=True)
    have = {}
    total = 0
    for cid in ids:
        for kind, names in KINDS.items():
            src = next((files[f'Voice_{cid}_{n}.mp3'] for n in names if f'Voice_{cid}_{n}.mp3' in files), None)
            if not src:
                continue
            data, rate = sf.read(src, always_2d=True)
            mono = data.mean(axis=1)
            dst = OUT / f'{cid}_{kind}.mp3'
            sf.write(dst, mono, rate, format='MP3', compression_level=0.9, bitrate_mode='VARIABLE')
            total += dst.stat().st_size
            have.setdefault(cid, []).append(kind)
    lines = ',\n'.join(f"  '{cid}': '{' '.join(k)}'" for cid, k in have.items())
    (ROOT / 'js' / 'voice_list.js').write_text(
        '// tools/build_voice.py가 만든 파일. 카드 id → 있는 음성 종류(deploy 배치, mvp 최고 활약, idle 로비)\n'
        f'const VOICE_LIST = {{\n{lines},\n}};\n', encoding='utf-8')
    print(f'카드 {len(have)}/{len(ids)}장, 파일 {sum(len(v) for v in have.values())}개, {total // 1024}KB')


if __name__ == '__main__':
    main()
