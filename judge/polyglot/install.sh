#!/bin/sh
# ติดตั้งแพ็กเกจทีละตัว — ตัวที่ไม่มีใน Debian รุ่นนี้ไม่ทำให้ build ล้ม แต่จดชื่อไว้ให้ตรวจ
set -u
apt-get update -qq
for pkg in "$@"; do
  if apt-get install -y -qq --no-install-recommends "$pkg" >/dev/null 2>&1; then
    echo "OK   $pkg"
  else
    echo "SKIP $pkg"
    echo "$pkg" >> /opt/arena/skipped.txt
  fi
done
apt-get clean
rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/* /usr/share/info/*
