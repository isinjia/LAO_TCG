# 원작 FullbodyIMG 일러스트에서 카드용 초상(portrait)과 전신(full) 이미지를 만든다.
# 사용법: python tools/build_art.py [id ...]
import os, re, sys
from pathlib import Path
from PIL import Image
import numpy as np

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parent.parent
SRC = Path(r'E:/LAO_Google_QA/Assets/AssetBundleResourceSub/Texture/FullbodyImg')
OUT_ART = ROOT / 'assets' / 'art'
OUT_FULL = ROOT / 'assets' / 'full'
OUT_ART.mkdir(parents=True, exist_ok=True)
OUT_FULL.mkdir(parents=True, exist_ok=True)

# 특수 매핑 (카드 id → 원본 파일명)
OVERRIDE = {
    'AGS_Fallen': 'FullbodyIMG_AGS_Fallen_RV.png',
    'AGS_Aeda': 'FullbodyIMG_AGS_Aeda_NS1_Dam_Part1.png',
    'BR_Brunhild': 'FullbodyIMG_BR_Brunhild_N_part1.png',
    'BR_Sirene': 'FullbodyIMG_BR_Sirene_N_DL_N.png',
    'BR_Sleipnir': 'FullbodyIMG_BR_Sleipnir_NS3.png',
    'DS_Cloverace': 'FullbodyIMG_DS_Cloverace_N_Dam.png',
    'PECS_Hestia': 'FullbodyIMG_PECS_Hestia_N_Part1.png',
    'PECS_LemonadeGamma': 'FullbodyIMG_PECS_LemonadeGamma_N_part1.png',
    'IW_NightChick': 'FullbodyIMG_MP_NightChick_N.png',
    'IW_Stalker': 'FullbodyIMG_MP_Stalker_N.png',
    'IW_Speaker': 'FullbodyIMG_MP_Speaker_N.png',
    'IW_RocC': 'FullbodyIMG_MP_RocC_N.png',
    'IW_Parasite': 'FullbodyIMG_MP_Metal_Parasite_N.png',
    # 기본(N) 일러스트는 로봇 부품이 흩어진 조립용 그림이라, 완성된 모습의 첫 스킨을 쓴다
    'AGS_Arachne': 'FullbodyIMG_AGS_Arachne_NS1_Part1.png',
    'IW_Kidnapper': 'FullbodyIMG_MP_Kidnapper_N.png',
    'IW_Robert': 'FullbodyIMG_MP_Robert_N.png',
    'IW_MetalGuard': '2DModel_MP_MetalGuard.png',
    'IW_IronPrince': '2DModel_MP_IronPrince_N.png',
    'IW_AzazelAlter': 'FullbodyIMG_MP_AzazelAlter_N.png',
    'IW_LemonadeOmega': 'FullbodyIMG_MP_LemonadeOmega_N.png',
    'IW_LemonadeZeta': 'FullbodyIMG_MP_LemonadeZeta_N.png',
}

# 초상 크롭 수동 보정: (cx 비율, top 비율, 폭 비율) — bbox 기준
CROP_FIX = {'PECS_BlindPrincess': (0.62, 0.1, 0.5), 'AGS_Arachne': (0.56, 0.0, 0.62)}
# 머리 기준 크롭 대신 전신을 3:4 캔버스에 맞춰 넣을 카드 (로봇·와이드 구도)
FIT = {'AGS_Aeda', 'DS_KunoichiShiden', 'DS_Ramiel', 'PECS_Lumberjane', 'IW_NightChick', 'IW_Speaker', 'IW_RocC', 'IW_Parasite', 'IW_Kidnapper', 'IW_Robert', 'IW_Stalker'}


# FullbodyImg에 완성본이 없어 2D 모델 폴더의 정식 일러스트를 쓰는 카드
SUB2D = Path(r'E:/LAO_Google_QA/Assets/AssetBundleResourceSub/Character_2D')
OVERRIDE_PATH = {}
# 기본(N) 일러스트가 애니메이션용 2D 모델(스프라이트+스키닝 메시)로만 존재하는 카드는
# tools/unity_render 로 Unity에서 직접 렌더링한 이미지를 최우선으로 쓴다.
RENDERS = ROOT / 'tools' / 'unity_render' / 'renders'


def rank(cid, f):
    # 낮을수록 우선: 기본 N → N 첫 조각 → N_DL → 정식 스킨(NS1+, 손상 제외) → 스킨 조각 → 손상 버전
    n = f[len(f'FullbodyIMG_{cid}_'):-4].lower()
    dam = 'dam' in n
    if n == 'n': return (0, n)
    if re.fullmatch(r'n_parts?1', n): return (1, n)
    if n.startswith('n_dl') or re.fullmatch(r'ndl\d*', n): return (2, n)
    m = re.fullmatch(r'ns(\d+)', n)
    if m and int(m.group(1)) >= 1: return (3, n)
    m = re.fullmatch(r'ns(\d+)_parts?1', n)
    if m and int(m.group(1)) >= 1 and not dam: return (4, n)
    if n.startswith('ns0'): return (9, n)  # 개발용 시안
    if dam: return (8, n)
    return (6, n)


def find_src(cid):
    r = RENDERS / f'{cid}.webp'
    if r.exists():
        return r
    if cid in OVERRIDE_PATH:
        return OVERRIDE_PATH[cid]
    if cid in OVERRIDE:
        return SRC / OVERRIDE[cid]
    cands = [f for f in os.listdir(SRC) if f.lower().startswith(f'fullbodyimg_{cid}_n'.lower()) and f.endswith('.png')]
    cands = [f for f in cands if 'bg' not in f.lower()]
    return SRC / min(cands, key=lambda f: rank(cid, f)) if cands else None


def fit_portrait(im):
    bbox = im.split()[-1].point(lambda v: 255 if v > 24 else 0).getbbox()
    im = im.crop(bbox)
    im.thumbnail((480, 640), Image.LANCZOS)
    canvas = Image.new('RGBA', (480, 640), (0, 0, 0, 0))
    canvas.paste(im, ((480 - im.width) // 2, 640 - im.height - 20 if im.height < 600 else (640 - im.height) // 2), im)
    return canvas


def head_portrait(im, head):
    # Unity 렌더에서 기록한 얼굴 위치를 중심으로 상반신을 자른다
    bb = im.split()[-1].point(lambda v: 255 if v > 24 else 0).getbbox()
    h_fig = bb[3] - bb[1]
    w = int(max(260, h_fig * 0.5)); h = int(w * 4 / 3)
    left = int(head[0] - w / 2); top = int(head[1] - h * 0.26)
    crop = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    crop.paste(im.crop((left, top, left + w, top + h)), (0, 0))
    return crop.resize((480, 640), Image.LANCZOS)


def portrait(im, cid):
    hj = RENDERS / f'{cid}.json'
    if hj.exists():
        import json
        return head_portrait(im, json.load(open(hj))['head'])
    if cid in FIT:
        return fit_portrait(im)
    a = np.array(im.split()[-1])
    ys, xs = np.where(a > 24)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    bw, bh = x1 - x0, y1 - y0
    # 상단 18% 영역의 알파 무게중심을 머리 중심으로 사용
    band = a[y0:y0 + max(8, int(bh * 0.18)), x0:x1 + 1] > 24
    cols = band.sum(axis=0)
    cx = x0 + (np.arange(len(cols)) * cols).sum() / max(1, cols.sum())
    if cid in CROP_FIX:
        fx, ft, fw = CROP_FIX[cid]
        cx = x0 + bw * fx
    # 크롭 크기: 세로 길이의 약 55%를 폭으로 (상반신)
    w = int(min(max(bh * 0.55, 300), max(bw, bh * 0.4)))
    if cid in CROP_FIX:
        w = int(bh * CROP_FIX[cid][2])
    h = int(w * 4 / 3)
    top = int(y0 - h * 0.04)
    if cid in CROP_FIX:
        top = int(y0 + bh * CROP_FIX[cid][1])
    left = int(cx - w / 2)
    crop = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    crop.paste(im.crop((left, top, left + w, top + h)), (0, 0))
    return crop.resize((480, 640), Image.LANCZOS)


# 전신 이미지에서 캐릭터와 떨어진 소품(드론 등)을 지우고 본체만 남길 카드
MAIN_ONLY = {'PECS_Orangeade', 'PECS_BlindPrincess', 'PECS_LemonadeBeta'}


def keep_main(im):
    from scipy import ndimage
    a = np.array(im)
    mask = a[:, :, 3] > 24
    lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=6))
    if n <= 1: return im
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    keep = 1 + int(np.argmax(sizes))
    a[lab != keep] = 0
    return Image.fromarray(a)


def full(im):
    bbox = im.split()[-1].point(lambda v: 255 if v > 24 else 0).getbbox()
    im = im.crop(bbox)
    im.thumbnail((1000, 1100), Image.LANCZOS)
    return im


def build(cid):
    src = find_src(cid)
    if not src or not src.exists():
        print('MISSING', cid)
        return False
    im = Image.open(src).convert('RGBA')
    if cid in MAIN_ONLY: im = keep_main(im)
    portrait(im, cid).save(OUT_ART / f'{cid}.webp', quality=82, method=6)
    full(im).save(OUT_FULL / f'{cid}.webp', quality=80, method=6)
    return True


if __name__ == '__main__':
    ids = sys.argv[1:]
    if not ids:
        data = (ROOT / 'js' / 'data.js').read_text(encoding='utf-8')
        ids = sorted(set(re.findall(r"id: '((?:3P|PECS|BR|DS|AGS|IW)_[A-Za-z0-9]+)'", data)))
    ok = sum(build(i) for i in ids)
    print(f'{ok}/{len(ids)} built')
