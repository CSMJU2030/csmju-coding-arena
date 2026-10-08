# image สำหรับรันโค้ดของผู้ใช้หลายภาษา (playground / ตัวตรวจ) — standards docs/deployment.md ข้อ 8
#   docker build -t coding-arena-polyglot judge/polyglot
#
# - ไม่มี daemon ไม่มี secret · api สั่ง `docker run` ผ่าน DOCKER_HOST (Docker แบบ rootless ของ DevOps)
# - บน server DevOps ดึง image นี้ไว้ล่วงหน้าแล้วอ้างด้วย digest (`--pull=never`) — user `judge` ไม่มีเน็ตขาออก
# - คำสั่ง compile/run ของแต่ละภาษาอยู่ที่ backend (`src/languages/languages.ts`) ไฟล์เดียว · image นี้มีแค่ toolchain + ตัวรัน
# - ติดตั้งทีละแพ็กเกจ: ตัวไหนไม่มีใน Debian รุ่นนี้ก็ข้ามแล้วจดใน /opt/arena/skipped.txt (ภาษานั้นจะไม่ผ่านการทดสอบ smoke)
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 LC_ALL=C.UTF-8

COPY install.sh /opt/arena/install.sh

# แยกเป็นกลุ่มเพื่อให้ cache ของ layer ใช้ซ้ำได้เมื่อแก้รายการ
RUN sh /opt/arena/install.sh ca-certificates python3 pypy3 nodejs node-typescript coffeescript ruby mruby php-cli perl rakudo \
      lua5.1 lua5.2 lua5.3 lua5.4 luajit tcl jimsh bash dash zsh fish ksh mksh yash posh tcsh rc es \
      gawk mawk original-awk sed bc dc busybox jq m4 sqlite3 quickjs
RUN sh /opt/arena/install.sh gcc g++ clang gobjc gfortran gnat fp-compiler gnucobol nasm binutils tcc gdc ldc \
      golang-go rustc valac nim
# JDK (และ mono/ghc) ใน debian-slim ต้องมีโฟลเดอร์ man ไม่งั้น postinst ล้ม — install.sh ลบเนื้อหา man ทิ้งท้ายทุกชั้น
RUN mkdir -p /usr/share/man/man1 /usr/share/man/man7
RUN sh /opt/arena/install.sh default-jdk-headless kotlin scala groovy clojure jruby rhino
RUN mkdir -p /usr/share/man/man1 && sh /opt/arena/install.sh mono-runtime mono-mcs mono-vbnc fsharp
RUN mkdir -p /usr/share/man/man1 && sh /opt/arena/install.sh ghc ocaml-nox polyml smlnj mlton erlang-nox elixir lfe racket guile-3.0 chicken-bin \
      sbcl clisp ecl gauche chezscheme scheme48 gambc picolisp newlisp fennel hy
RUN mkdir -p /usr/share/man/man1 && sh /opt/arena/install.sh swi-prolog-nox gprolog gforth pforth gnu-smalltalk pike8.0 regina-rexx algol68g \
      bwbasic yabasic ucblogo ghostscript nickle pari-gp beef r-base-core haxe neko yorick squirrel3 clips

COPY arena-run.py /opt/arena/arena-run.py

# ผู้ใช้ nobody (65534) — api สั่ง --user=65534:65534 ซ้ำอีกชั้น
USER 65534:65534
WORKDIR /box
ENTRYPOINT ["python3", "-I", "/opt/arena/arena-run.py"]
