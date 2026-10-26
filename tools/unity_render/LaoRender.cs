// 2D 캐릭터 프리팹(스프라이트 + 스키닝 메시)을 투명 배경 PNG로 렌더링한다.
// Unity 배치 모드 전용: -executeMethod LaoRender.Run -prefab <Assets/...prefab> -out <png> [-clip <이름 일부>] [-size 2400]
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

public static class LaoRender
{
    static string Arg(string key, string def = null)
    {
        var a = System.Environment.GetCommandLineArgs();
        for (int i = 0; i < a.Length - 1; i++) if (a[i] == key) return a[i + 1];
        return def;
    }

    // -list <파일>: 각 줄 "prefab경로|출력png" 를 순서대로 렌더링
    public static void Run()
    {
        int size = int.Parse(Arg("-size", "2400"));
        string list = Arg("-list");
        if (list != null)
        {
            foreach (var line in File.ReadAllLines(list))
            {
                var parts = line.Split('|'); if (parts.Length < 2) continue;
                try { RenderOne(parts[0].Trim(), parts[1].Trim(), Arg("-clip", ""), size); }
                catch (System.Exception e) { Debug.LogError("LAO: FAIL " + parts[0] + " " + e); }
            }
        }
        else RenderOne(Arg("-prefab"), Arg("-out"), Arg("-clip", ""), size);
        EditorApplication.Exit(0);
    }

    static void RenderOne(string prefabPath, string outPath, string clipName, int size)
    {
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);
        if (prefab == null) { Debug.LogError("LAO: prefab not found " + prefabPath); return; }
        var go = (GameObject)Object.Instantiate(prefab);
        go.transform.position = Vector3.zero;

        // 애니메이션 첫 프레임(기본 포즈)을 샘플링: 눈·입 등 교체 파츠의 표시 상태를 맞춘다
        var anim = go.GetComponentInChildren<Animator>();
        if (anim != null && anim.runtimeAnimatorController != null)
        {
            var clips = anim.runtimeAnimatorController.animationClips;
            Debug.Log("LAO: clips = " + string.Join(", ", clips.Select(c => c.name)));
            var clip = clips.FirstOrDefault(c => clipName != "" && c.name.ToLower().Contains(clipName.ToLower()))
                       ?? clips.FirstOrDefault(c => c.name.ToLower().EndsWith("_idle"))
                       ?? clips.FirstOrDefault();
            if (clip != null && clipName != "none") { clip.SampleAnimation(anim.gameObject, 0f); Debug.Log("LAO: sampled " + clip.name); }
            anim.enabled = false;
        }

        // 지원되지 않는 셰이더는 스프라이트 기본 셰이더로 대체
        var fallback = Shader.Find("Sprites/Default");
        foreach (var r in go.GetComponentsInChildren<Renderer>(true))
        {
            var mats = r.sharedMaterials;
            for (int i = 0; i < mats.Length; i++)
            {
                var m = mats[i];
                if (m == null || m.shader == null || !m.shader.isSupported || m.shader.name.Contains("InternalError"))
                {
                    var nm = new Material(fallback);
                    if (m != null && m.HasProperty("_MainTex")) nm.mainTexture = m.mainTexture;
                    mats[i] = nm;
                }
            }
            r.sharedMaterials = mats;
            var smr = r as SkinnedMeshRenderer;
            if (smr != null) smr.updateWhenOffscreen = true;
        }

        // 화면에 보이는 렌더러의 경계
        var rs = go.GetComponentsInChildren<Renderer>(false).Where(r => r.enabled && !(r is ParticleSystemRenderer) && !(r is TrailRenderer) && !(r is LineRenderer)).ToArray();
        if (rs.Length == 0) { Debug.LogError("LAO: no renderers " + prefabPath); Object.DestroyImmediate(go); return; }
        var b = rs[0].bounds; foreach (var r in rs) b.Encapsulate(r.bounds);
        Debug.Log("LAO: bounds " + b);

        float aspect = b.size.x / b.size.y;
        int h = size, w = Mathf.Max(64, Mathf.RoundToInt(size * aspect));
        var camGo = new GameObject("cam"); var cam = camGo.AddComponent<Camera>();
        cam.orthographic = true; cam.orthographicSize = b.extents.y * 1.02f;
        cam.transform.position = new Vector3(b.center.x, b.center.y, b.center.z - 50f);
        cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0, 0, 0, 0);
        cam.nearClipPlane = 0.01f; cam.farClipPlane = 500f; cam.aspect = (float)w / h;
        var rt = new RenderTexture(w, h, 24, RenderTextureFormat.ARGB32); rt.antiAliasing = 4;
        cam.targetTexture = rt; cam.Render();
        RenderTexture.active = rt;
        var tex = new Texture2D(w, h, TextureFormat.ARGB32, false);
        tex.ReadPixels(new Rect(0, 0, w, h), 0, 0); tex.Apply();
        Directory.CreateDirectory(Path.GetDirectoryName(outPath));
        File.WriteAllBytes(outPath, tex.EncodeToPNG());
        Debug.Log("LAO: wrote " + outPath + " " + w + "x" + h);

        // 얼굴 파츠(눈·눈썹·입·볼) 위치를 픽셀 좌표로 기록 → 카드 초상 크롭에 사용
        var faceKeys = new[] { "eye", "mouse", "mouth", "eyebrow", "cheek", "face" };
        Bounds? fb = null;
        foreach (var r in rs)
        {
            var n = r.gameObject.name.ToLower();
            if (!faceKeys.Any(k => n.Contains(k))) continue;
            if (fb == null) fb = r.bounds; else { var t = fb.Value; t.Encapsulate(r.bounds); fb = t; }
        }
        if (fb != null)
        {
            var mn = cam.WorldToViewportPoint(fb.Value.min); var mx = cam.WorldToViewportPoint(fb.Value.max);
            File.WriteAllText(Path.ChangeExtension(outPath, ".json"),
                "{\"x0\":" + (mn.x * w).ToString("F1") + ",\"x1\":" + (mx.x * w).ToString("F1") +
                ",\"y0\":" + ((1 - mx.y) * h).ToString("F1") + ",\"y1\":" + ((1 - mn.y) * h).ToString("F1") +
                ",\"w\":" + w + ",\"h\":" + h + "}");
        }
        RenderTexture.active = null; cam.targetTexture = null;
        Object.DestroyImmediate(rt); Object.DestroyImmediate(camGo); Object.DestroyImmediate(go);
    }
}
