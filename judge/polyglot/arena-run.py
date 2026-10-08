"""ตัวรันโค้ดใน container — อ่านงานจาก stdin (JSON) แล้วพิมพ์ผลเป็น JSON บรรทัดเดียวทาง stdout

งานที่ api ส่งมา (api เป็นผู้กำหนดคำสั่ง ผู้ใช้ส่งได้แค่ซอร์สโค้ดกับ input):
  {"files": [{"name": "main.c", "content": "..."}],
   "compile": ["gcc", "main.c", "-o", "main"] | null,
   "run": ["./main"],
   "input": "...", "limitMs": 5000, "compileLimitMs": 20000}

ผล: {"status": "OK|RUNTIME_ERROR|TIME_LIMIT_EXCEEDED|OUTPUT_LIMIT_EXCEEDED|COMPILE_ERROR",
     "exitCode": int|null, "stdout": str, "stderr": str, "compileOutput": str, "timeMs": int}

ความปลอดภัยหลักอยู่ที่ flag ของ docker run (ไม่มีเน็ต · read-only · ไม่ใช่ root · จำกัด RAM/CPU/pids)
ตัวนี้เพิ่ม: เวลาจำกัด · ขนาดไฟล์ output จำกัด (RLIMIT_FSIZE) · ฆ่าทั้ง process group เมื่อหมดเวลา
"""

import json
import os
import resource
import signal
import subprocess
import sys
import time

BOX = "/box"
OUTPUT_LIMIT = 1 << 20  # 1 MiB ต่อไฟล์ output
SHOW_LIMIT = 64 * 1024  # ส่งกลับไม่เกิน 64 KiB ต่อช่อง


def limits():
    os.setsid()
    resource.setrlimit(resource.RLIMIT_FSIZE, (OUTPUT_LIMIT, OUTPUT_LIMIT))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


def read(path):
    try:
        with open(path, "rb") as f:
            data = f.read(SHOW_LIMIT + 1)
    except OSError:
        return "", False
    return data[:SHOW_LIMIT].decode("utf-8", "replace"), len(data) > SHOW_LIMIT


def execute(argv, stdin_path, out_path, err_path, timeout_s, env):
    with open(stdin_path, "rb") as i, open(out_path, "wb") as o, open(err_path, "wb") as e:
        start = time.monotonic()
        try:
            proc = subprocess.Popen(argv, stdin=i, stdout=o, stderr=e, cwd=BOX, env=env, preexec_fn=limits)
        except OSError as error:
            e.write(f"เริ่มโปรแกรมไม่ได้: {error}".encode())
            return None, 0, False
        try:
            code = proc.wait(timeout=timeout_s)
            timed_out = False
        except subprocess.TimeoutExpired:
            timed_out = True
            code = None
        finally:
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except OSError:
                pass
            proc.wait()
        return code, int((time.monotonic() - start) * 1000), timed_out


def main():
    job = json.loads(sys.stdin.read())
    os.makedirs(f"{BOX}/home", exist_ok=True)
    os.makedirs(f"{BOX}/tmp", exist_ok=True)
    for f in job["files"]:
        name = f["name"]
        if "/" in name or name.startswith("."):
            raise SystemExit(2)
        with open(f"{BOX}/{name}", "w", encoding="utf-8") as out:
            out.write(f["content"])
    with open(f"{BOX}/.stdin", "w", encoding="utf-8") as out:
        out.write(job.get("input", ""))
    open(f"{BOX}/.empty", "w").close()

    env = {
        "PATH": "/usr/local/bin:/usr/bin:/bin",
        "HOME": f"{BOX}/home",
        "TMPDIR": f"{BOX}/tmp",
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "GOCACHE": f"{BOX}/tmp/go-cache",
        "GOPATH": f"{BOX}/tmp/go",
        "GO111MODULE": "off",
        "DOTNET_CLI_TELEMETRY_OPTOUT": "1",
        "MONO_GAC_PREFIX": f"{BOX}/tmp",
        "XDG_CACHE_HOME": f"{BOX}/tmp/cache",
        "TERM": "dumb",
    }
    result = {"status": "OK", "exitCode": None, "stdout": "", "stderr": "", "compileOutput": "", "timeMs": 0}

    if job.get("compile"):
        code, _, timed_out = execute(job["compile"], f"{BOX}/.empty", f"{BOX}/.cout", f"{BOX}/.cerr",
                                     job.get("compileLimitMs", 20000) / 1000, env)
        out, _ = read(f"{BOX}/.cout")
        err, _ = read(f"{BOX}/.cerr")
        result["compileOutput"] = (out + err)[:SHOW_LIMIT]
        if timed_out or code != 0:
            result["status"] = "COMPILE_ERROR"
            if timed_out:
                result["compileOutput"] += "\n(คอมไพล์นานเกินกำหนด)"
            print(json.dumps(result, ensure_ascii=False))
            return

    # บอก api ว่าเริ่มนับเวลาของโปรแกรมได้ (เวลาบูต container และคอมไพล์ไม่นับ)
    sys.stderr.write("ARENA_READY\n")
    sys.stderr.flush()

    code, ms, timed_out = execute(job["run"], f"{BOX}/.stdin", f"{BOX}/.out", f"{BOX}/.err",
                                  job.get("limitMs", 5000) / 1000, env)
    result["stdout"], cut_out = read(f"{BOX}/.out")
    result["stderr"], cut_err = read(f"{BOX}/.err")
    result["exitCode"] = code
    result["timeMs"] = ms
    if timed_out:
        result["status"] = "TIME_LIMIT_EXCEEDED"
    elif code == -signal.SIGXFSZ or os.path.getsize(f"{BOX}/.out") >= OUTPUT_LIMIT:
        result["status"] = "OUTPUT_LIMIT_EXCEEDED"
    elif code != 0:
        result["status"] = "RUNTIME_ERROR"
    if cut_out or cut_err:
        result["truncated"] = True
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
