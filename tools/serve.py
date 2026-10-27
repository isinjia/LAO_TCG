"""로컬 정적 서버 (개발용, 캐시 끔).

브라우저가 예전 js/css를 캐시에서 읽지 않도록 모든 응답에 Cache-Control: no-store를 붙인다.
사용법: python tools/serve.py [포트]   (기본 8765)
"""
import http.server
import mimetypes
import os
import sys


mimetypes.add_type('font/woff2', '.woff2')


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        # 정상 요청 로그는 숨기고 오류(4xx/5xx)만 보여 준다
        if len(args) >= 2 and str(args[1])[:1] in "45":
            super().log_message(fmt, *args)


if __name__ == "__main__":
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    # 포트를 따로 주지 않으면 PORT 환경 변수(미리보기 도구가 빈 포트를 넘겨줌), 그것도 없으면 8765
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 8765))
    print(f"serving http://localhost:{port}  (Ctrl+C to stop)", flush=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCache).serve_forever()
