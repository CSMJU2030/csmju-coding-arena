"use client";
export function CodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col bg-surface-container-lowest">
      <label
        htmlFor="python-source"
        className="border-b border-outline-variant/40 px-4 py-3 text-label-md text-on-surface"
      >
        โค้ดคำตอบภาษา Python
      </label>
      <textarea
        id="python-source"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        maxLength={10000}
        className="min-h-48 w-full flex-1 resize-none rounded-lg bg-surface-container-lowest p-4 font-mono text-body-md text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
