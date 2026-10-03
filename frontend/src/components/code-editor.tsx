"use client";

import Editor from "@monaco-editor/react";
import { useState } from "react";

/** Keep code input usable while the existing editor assets load. */
export function CodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [ready, setReady] = useState(false);
  return (
    <div className="relative h-full min-w-0 bg-surface-container-lowest">
      <Editor
        height="100%"
        defaultLanguage="python"
        theme="vs"
        value={value}
        onChange={(next) => onChange(next ?? "")}
        onMount={() => setReady(true)}
        loading={null}
        options={{
          fontSize: 16,
          minimap: { enabled: false },
          automaticLayout: true,
          padding: { top: 16 },
          ariaLabel: "โค้ดคำตอบภาษา Python",
        }}
      />
      {!ready && (
        <textarea
          aria-label="โค้ดคำตอบภาษา Python"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="absolute inset-0 h-full w-full resize-none rounded-lg bg-surface-container-lowest p-4 font-mono text-body-md text-on-surface focus-visible:outline-2 focus-visible:outline-primary-container"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
