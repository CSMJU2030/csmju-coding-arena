/**
 * ทดสอบทุกภาษาใน image polyglot ด้วยโค้ดตั้งต้นของภาษานั้น — ใช้ตอน build image ใหม่ และซ้อมกับ DevOps บน server
 *
 *   pnpm --filter backend languages:smoke            # ทุกภาษา
 *   pnpm --filter backend languages:smoke python c   # เฉพาะที่ระบุ
 *
 * ใช้ Docker ตาม DOCKER_HOST เดียวกับ api · image ตาม POLYGLOT_IMAGE
 * ผล: ตารางภาษา/สถานะ/เวลา และจำนวนที่ผ่าน · exit 1 ถ้ามีภาษาที่ไม่ผ่าน
 */
import { LANGUAGES } from '../languages/languages';
import { PolyglotRunner } from '../languages/polyglot-runner';

async function main() {
  const only = process.argv.slice(2);
  const runner = new PolyglotRunner();
  const targets = LANGUAGES.filter((l) => !only.length || only.includes(l.id));
  const failed: string[] = [];

  for (const language of targets) {
    const started = Date.now();
    let line: string;

    try {
      const result = await runner.run(
        language,
        language.template,
        language.stdin,
        10_000,
      );
      const ok =
        result.status === 'OK' && result.stdout.includes(language.expect);

      if (!ok) failed.push(language.id);
      const detail = ok
        ? ''
        : ` ${result.status} ${(result.compileOutput + result.stderr + result.stdout).replace(/\s+/g, ' ').slice(0, 160)}`;

      line = `${ok ? 'PASS' : 'FAIL'} ${language.id.padEnd(16)} ${String(Date.now() - started).padStart(6)}ms${detail}`;
    } catch (error) {
      failed.push(language.id);
      line = `FAIL ${language.id.padEnd(16)} ${error instanceof Error ? error.message : String(error)}`;
    }
    console.log(line);
  }

  console.log(`\n${targets.length - failed.length}/${targets.length} ภาษาผ่าน`);
  if (failed.length) {
    console.log(`ไม่ผ่าน: ${failed.join(' ')}`);
    process.exitCode = 1;
  }
}

void main();
