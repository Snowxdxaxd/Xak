import { useState, useRef, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import {
  Play, RotateCcw, Copy, CheckCheck, Terminal,
  Code2, ChevronDown, Loader2, Lightbulb,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', ext: 'js', color: '#f7df1e', bg: '#1e1e1e' },
  { id: 'python',     label: 'Python',     ext: 'py', color: '#4584b6', bg: '#1e1e1e' },
] as const;

type LangId = typeof LANGUAGES[number]['id'];

const EXAMPLES: Record<LangId, { label: string; code: string }[]> = {
  javascript: [
    {
      label: 'Hello World',
      code: `// Привет, мир!\nconsole.log("Привет, мир!");\nconsole.log("Добро пожаловать в CodeKids!");`,
    },
    {
      label: 'Цикл for',
      code: `// Таблица умножения на 3\nfor (let i = 1; i <= 10; i++) {\n  console.log(\`3 × \${i} = \${3 * i}\`);\n}`,
    },
    {
      label: 'Функция',
      code: `// Функция факториала\nfunction factorial(n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}\n\nfor (let i = 1; i <= 7; i++) {\n  console.log(\`\${i}! = \${factorial(i)}\`);\n}`,
    },
    {
      label: 'Массивы',
      code: `const fruits = ["яблоко", "банан", "апельсин", "манго"];\n\nconsole.log("Фрукты:");\nfruits.forEach((fruit, i) => {\n  console.log(\`  \${i + 1}. \${fruit}\`);\n});\n\nconst sorted = [...fruits].sort();\nconsole.log("\\nПо алфавиту:", sorted.join(", "));`,
    },
    {
      label: 'Рекурсия (Фибоначчи)',
      code: `function fib(n) {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}\n\nconsole.log("Числа Фибоначчи:");\nfor (let i = 0; i < 10; i++) {\n  process.stdout?.write ? process.stdout.write(fib(i) + " ") : console.log(fib(i));\n}\nconsole.log(Array.from({length:10}, (_,i) => fib(i)).join(", "));`,
    },
  ],
  python: [
    {
      label: 'Hello World',
      code: `# Привет, мир!\nprint("Привет, мир!")\nprint("Добро пожаловать в CodeKids!")`,
    },
    {
      label: 'Цикл for',
      code: `# Таблица умножения на 3\nfor i in range(1, 11):\n    print(f"3 × {i} = {3 * i}")`,
    },
    {
      label: 'Функция',
      code: `# Функция факториала\ndef factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nfor i in range(1, 8):\n    print(f"{i}! = {factorial(i)}")`,
    },
    {
      label: 'Список',
      code: `fruits = ["яблоко", "банан", "апельсин", "манго"]\n\nprint("Фрукты:")\nfor i, fruit in enumerate(fruits, 1):\n    print(f"  {i}. {fruit}")\n\nprint("\\nПо алфавиту:", ", ".join(sorted(fruits)))`,
    },
    {
      label: 'Классы',
      code: `class Animal:\n    def __init__(self, name, sound):\n        self.name = name\n        self.sound = sound\n    \n    def speak(self):\n        print(f"{self.name} говорит: {self.sound}!")\n\ndog = Animal("Собака", "Гав")\ncat = Animal("Кошка", "Мяу")\ncow = Animal("Корова", "Му")\n\nfor animal in [dog, cat, cow]:\n    animal.speak()`,
    },
  ],
};

// Iframe HTML for Python (Pyodide) execution
function makePyodideHTML(code: string): string {
  const escaped = code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script src="https://cdn.jsdelivr.net/pyodide/v0.27.3/full/pyodide.js"></script>
<script>
(async () => {
  try {
    const pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.3/full/" });
    pyodide.runPython("import sys, io; sys.stdout = io.StringIO(); sys.stderr = io.StringIO()");
    try {
      pyodide.runPython(\`${escaped}\`);
      const out = pyodide.runPython("sys.stdout.getvalue()");
      const err = pyodide.runPython("sys.stderr.getvalue()");
      parent.postMessage({ type: "done", output: out, error: err || null }, "*");
    } catch(e) {
      const out = pyodide.runPython("sys.stdout.getvalue()");
      parent.postMessage({ type: "done", output: out, error: e.message }, "*");
    }
  } catch(e) {
    parent.postMessage({ type: "done", output: "", error: "Ошибка загрузки Python: " + e.message }, "*");
  }
})();
</script>
</body>
</html>`;
}

export function CodePlayground() {
  const { t } = useLanguage();
  const [lang, setLang] = useState<LangId>('javascript');
  const [code, setCode] = useState(EXAMPLES.javascript[0].code);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [pyReady, setPyReady] = useState(false);
  const [pyLoading, setPyLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleLangChange = (l: LangId) => {
    setLang(l);
    setCode(EXAMPLES[l][0].code);
    setOutput('');
    setError(null);
    setPyReady(false);
  };

  const loadPython = useCallback(() => {
    if (pyReady || pyLoading) return;
    setPyLoading(true);
    // iframe will be used for execution; just mark ready after a moment
    const iframe = iframeRef.current;
    if (!iframe) return;
    // Create a tiny init document to load Pyodide
    const initHtml = makePyodideHTML('print("ready")');
    iframe.srcdoc = initHtml;
  }, [pyReady, pyLoading]);

  useEffect(() => {
    if (lang === 'python') loadPython();
  }, [lang, loadPython]);

  // Listen for messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'done') {
        const { output: out, error: err } = e.data;
        if (!pyReady && pyLoading) {
          // First message means Pyodide loaded
          setPyReady(true);
          setPyLoading(false);
        }
        setOutput(out || '');
        setError(err || null);
        setRunning(false);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [pyReady, pyLoading]);

  const runCode = async () => {
    if (!code.trim()) { toast.error('Напишите код для выполнения'); return; }
    setRunning(true);
    setOutput('');
    setError(null);

    if (lang === 'javascript') {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch('/api/code/run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ code, language: 'javascript' }),
        });
        const data = await res.json();
        setOutput(data.output || '');
        setError(data.error || null);
      } catch (err: any) {
        setError('Ошибка соединения с сервером');
      } finally {
        setRunning(false);
      }
    } else {
      // Python via iframe
      const iframe = iframeRef.current;
      if (!iframe) { setRunning(false); return; }
      const html = makePyodideHTML(code);
      iframe.srcdoc = html;
      // running stays true until message comes back
    }
  };

  const resetCode = () => {
    setCode(EXAMPLES[lang][0].code);
    setOutput('');
    setError(null);
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(output + (error ? '\n' + error : ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    }
  };

  const currentLang = LANGUAGES.find(l => l.id === lang)!;
  const examples = EXAMPLES[lang];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{t('playground_title')}</h1>
            <Badge variant="secondary" className="text-xs">Онлайн</Badge>
          </div>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Ctrl+Enter — запустить
          </p>
        </div>

        {/* Lang selector + examples */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {LANGUAGES.map(l => (
              <button
                key={l.id}
                onClick={() => handleLangChange(l.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  lang === l.id
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                {l.label}
              </button>
            ))}
          </div>

          {/* Examples dropdown */}
          <div className="relative">
            <Button
              variant="outline" size="sm"
              className="gap-1.5"
              onClick={() => setShowExamples(v => !v)}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Примеры
              <ChevronDown className={`w-3 h-3 transition-transform ${showExamples ? 'rotate-180' : ''}`} />
            </Button>
            <AnimatePresence>
              {showExamples && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 top-full mt-1 w-52 bg-popover border rounded-md shadow-lg z-50 py-1"
                >
                  {examples.map(ex => (
                    <button
                      key={ex.label}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => { setCode(ex.code); setOutput(''); setError(null); setShowExamples(false); }}
                    >
                      {ex.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {lang === 'python' && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {pyLoading ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Загрузка Python (WebAssembly)...</>
              ) : pyReady ? (
                <><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Python готов</>
              ) : (
                <><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Python загружается при первом запуске</>
              )}
            </div>
          )}
        </div>

        {/* Editor + Output */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Editor */}
          <Card className="overflow-hidden flex flex-col" style={{ minHeight: '480px' }}>
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/60" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <span className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  main.{currentLang.ext}
                </span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={resetCode} title="Сбросить">
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 w-full resize-none bg-zinc-950 text-zinc-100 font-mono text-sm p-4 focus:outline-none leading-relaxed"
              style={{ minHeight: '400px', tabSize: 2 }}
              placeholder="// Напишите ваш код здесь..."
            />
            <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {code.split('\n').length} строк · {code.length} символов
              </span>
              <Button
                size="sm"
                onClick={runCode}
                disabled={running}
                className="gap-1.5 min-w-[90px]"
              >
                {running
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('playground_running')}</>
                  : <><Play className="w-3.5 h-3.5" /> Запустить</>
                }
              </Button>
            </div>
          </Card>

          {/* Output */}
          <Card className="overflow-hidden flex flex-col" style={{ minHeight: '480px' }}>
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t('playground_output')}</span>
                {error && <Badge variant="destructive" className="text-xs">Ошибка</Badge>}
                {!error && output && <Badge variant="secondary" className="text-xs text-green-600 dark:text-green-400">OK</Badge>}
              </div>
              {(output || error) && (
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={copyOutput}>
                  {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              )}
            </div>

            <div className="flex-1 bg-zinc-950 p-4 font-mono text-sm overflow-auto" style={{ minHeight: '400px' }}>
              {running && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {lang === 'python' && !pyReady
                      ? 'Загрузка Python (WebAssembly)... ~10 сек...'
                      : t('playground_running')}
                  </span>
                </div>
              )}
              {!running && !output && !error && (
                <p className="text-zinc-600 select-none">// Результат появится здесь после запуска</p>
              )}
              {!running && output && (
                <pre className="text-zinc-100 whitespace-pre-wrap break-all">{output}</pre>
              )}
              {!running && error && (
                <div>
                  {output && <pre className="text-zinc-100 whitespace-pre-wrap break-all mb-3">{output}</pre>}
                  <pre className="text-red-400 whitespace-pre-wrap break-all">
                    <span className="text-red-500 font-semibold">Ошибка: </span>{error}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-4 py-2 bg-muted/50 border-t">
              <p className="text-xs text-muted-foreground">
                {lang === 'javascript'
                  ? 'JavaScript выполняется на сервере в изолированной среде'
                  : 'Python выполняется в браузере через WebAssembly (Pyodide)'}
              </p>
            </div>
          </Card>
        </div>

        {/* Hidden iframe for Python */}
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts"
          style={{ display: 'none' }}
          title="python-runner"
        />
      </div>
    </Layout>
  );
}
