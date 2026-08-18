const langRow = document.getElementById('langRow');
const languages = [{ id: 'js', label: 'JS' }, { id: 'python', label: 'PY' }, { id: 'cpp', label: 'C++' }, { id: 'java', label: 'JAVA' }, { id: 'ruby', label: 'RB' }];
const codeStore = {
  js: 'let name = "NZM";\nconsole.log("Hub online for", name);',
  python: 'name = "NZM"\nprint("Hub online for", name)',
  cpp: '#include <iostream>\nusing namespace std;\nint main() {\n  string name = "NZM";\n  cout << "Hub online for " << name << endl;\n  return 0;\n}',
  java: 'public class Main {\n  public static void main(String[] args) {\n    String name = "NZM";\n    System.out.println("Hub online for " + name);\n  }\n}',
  ruby: 'name = "NZM"\nputs "Hub online for #{name}"'
};
let activeLang = 'js';
function renderLangRow() {
  langRow.innerHTML = '';
  languages.forEach(l => {
    const b = document.createElement('button');
    b.className = 'langBtn' + (l.id === activeLang ? ' active' : '');
    b.textContent = l.label;
    b.addEventListener('click', () => { activeLang = l.id; document.getElementById('codeEditor').value = codeStore[activeLang]; renderLangRow(); });
    langRow.appendChild(b);
  });
}
renderLangRow();
document.getElementById('codeEditor').value = codeStore[activeLang];
document.getElementById('codeEditor').addEventListener('input', e => { codeStore[activeLang] = e.target.value; });
document.getElementById('codeEditor').addEventListener('keydown', e => {
  if (e.key === 'Tab') { e.preventDefault(); const t = e.target, s = t.selectionStart, en = t.selectionEnd; t.value = t.value.slice(0, s) + '  ' + t.value.slice(en); t.selectionStart = t.selectionEnd = s + 2; }
});
function pythonToJS(src) {
  return src.replace(/f"([^"]*)"/g, (m, p) => '`' + p.replace(/\{([^}]*)\}/g, '${$1}') + '`')
    .replace(/f'([^']*)'/g, (m, p) => '`' + p.replace(/\{([^}]*)\}/g, '${$1}') + '`')
    .replace(/print\(/g, 'console.log(').replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null');
}
function cppToJS(src) {
  let body = src.replace(/#include[^\n]*\n?/g, '').replace(/using\s+namespace\s+std\s*;\n?/g, '')
    .replace(/int\s+main\s*\([^)]*\)\s*\{/, '').replace(/\b(int|float|double|bool|string|auto|char)\s+/g, '')
    .replace(/return\s+0\s*;/g, '')
    .replace(/cout\s*((?:<<[^;]+)+);/g, (m, chain) => { const parts = chain.split('<<').map(s => s.trim()).filter(s => s && s !== 'endl'); return 'console.log(' + parts.join(',') + ');'; });
  body = body.trim();
  if (body.endsWith('}')) body = body.slice(0, -1);
  return body.trim();
}
function javaToJS(src) {
  let body = src.replace(/public\s+class\s+\w+\s*\{/, '').replace(/public\s+static\s+void\s+main\s*\([^)]*\)\s*\{/, '')
    .replace(/\b(String|int|float|double|boolean|char)\s+/g, '').replace(/System\.out\.println\(/g, 'console.log(');
  body = body.trim(); if (body.endsWith('}')) body = body.slice(0, -1);
  body = body.trim(); if (body.endsWith('}')) body = body.slice(0, -1);
  return body.trim();
}
function rubyToJS(src) {
  return src.replace(/"([^"]*)"/g, (m, p) => p.includes('#{') ? '`' + p.replace(/#\{([^}]*)\}/g, '${$1}') + '`' : m).replace(/puts\s+(.+)/g, 'console.log($1)');
}
function runCode() {
  const src = codeStore[activeLang];
  let js = src;
  if (activeLang === 'python') js = pythonToJS(src);
  else if (activeLang === 'cpp') js = cppToJS(src);
  else if (activeLang === 'java') js = javaToJS(src);
  else if (activeLang === 'ruby') js = rubyToJS(src);
  const logs = [];
  const original = console.log;
  console.log = (...a) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' '));
  try { new Function(js)(); } catch (e) { logs.push('Runtime error: ' + e.message); }
  console.log = original;
  document.getElementById('compilerOutput').textContent = logs.length ? logs.join('\n') : 'No output';
}
document.getElementById('runBtn').addEventListener('click', runCode);
document.getElementById('clearOutBtn').addEventListener('click', () => { document.getElementById('compilerOutput').textContent = 'Ready'; });