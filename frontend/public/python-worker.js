// โหลด Pyodide ผ่าน CDN สำหรับรัน WebAssembly
importScripts("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");

let pyodideReadyPromise = loadPyodide();

self.onmessage = async (event) => {
  const { id, code, input } = event.data;
  
  try {
    const pyodide = await pyodideReadyPromise;
    
    // เตรียม Environment จำลอง STDIN / STDOUT
    pyodide.setStdout({ batched: (msg) => self.postMessage({ id, type: 'stdout', msg }) });
    
    // หากมี Input ให้ inject เข้าไปจำลองการรับค่า
    if (input) {
      pyodide.globals.set('sys_input', input);
      await pyodide.runPythonAsync(`
        import sys
        from io import StringIO
        sys.stdin = StringIO(sys_input)
      `);
    }

    await pyodide.runPythonAsync(code);
    self.postMessage({ id, type: 'done' });
  } catch (error) {
    self.postMessage({ id, type: 'error', error: error.message });
  }
};