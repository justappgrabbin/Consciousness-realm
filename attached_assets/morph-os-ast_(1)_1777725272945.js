/* ═══════════════════════════════════════════════════════════════════
   MORPH AST v4.0 — Abstract Syntax Tree Engine
   Parses JS, TS, CSS, Vue, Svelte into structural meaning
   Maps AST nodes to codon states for substrate integration
   ═══════════════════════════════════════════════════════════════════ */

class MorphAST {
  constructor() {
    this.codonRules = this._initCodonRules();
  }

  _initCodonRules() {
    return Array.from({length: 64}, (_, i) => ({
      id: i,
      archetype: this._getArchetype(i),
      element: this._getElement(i),
      quality: this._getQuality(i)
    }));
  }

  _getArchetype(n) {
    const archetypes = [
      'creative','receptive','difficult','youth','waiting','conflict','army','union',
      'small_tame','treading','peace','standstill','fellowship','possession','modesty','enthusiasm',
      'following','work','approach','contemplation','biting','grace','splitting','return',
      'innocence','taming','mouth','preponderance','abyss','clinging','influence','duration',
      'retreat','power','progress','darkening','family','opposition','obstruction','deliverance',
      'decrease','increase','breakthrough','coming','gathering','pushing','confining','well',
      'revolution','cauldron','arousing','keeping','development','marrying','abundance','wanderer',
      'penetrating','joyous','dispersion','limitation','centering','transitioning','completing','incompleting'
    ];
    return archetypes[n] || 'unknown';
  }

  _getElement(n) {
    const elements = ['water','fire','thunder','lake','mountain','wind','earth','heaven'];
    return elements[n % 8] || 'void';
  }

  _getQuality(n) {
    const qualities = [
      'initiating','yielding','diffusing','enveloping','suspending','arguing','organizing','grouping',
      'constraining','treading','prospering','stagnating','associating','owning','humbling','providing',
      'adapting','repairing','nearing','viewing','punishing','adorning','stripping','returning',
      'freeing','accumulating','nourishing','exceeding','flowing','radiating','wooing','persevering',
      'withdrawing','strengthening','illuminating','injuring','clanning','contrasting','obstructing','liberating',
      'diminishing','augmenting','resolving','meeting','clustering','ascending','exhausting','replenishing',
      'renewing','cooking','shocking','resting','maturing','converting','fulfilling','roaming',
      'entering','pleasing','dissolving','regulating','centering','transitioning','completing','incompleting'
    ];
    return qualities[n] || 'unknown';
  }

  /* ═══════════════════════════════════════════════════════════════
     JS/TS PARSER — Recursive descent, no dependencies
     Handles: functions, classes, imports, exports, variables, control flow
     ═══════════════════════════════════════════════════════════════ */
  parseJS(code, filename = 'unknown') {
    const tokens = this._tokenizeJS(code);
    const ast = this._parseJSTokens(tokens, filename);
    return this._enrichAST(ast, code, filename);
  }

  _tokenizeJS(code) {
    const tokens = [];
    let pos = 0;
    const len = code.length;

    const keywords = new Set([
      'const','let','var','function','class','extends','import','export','default','from',
      'if','else','for','while','do','switch','case','break','continue','return','try','catch','finally',
      'throw','new','this','super','typeof','instanceof','in','of','async','await','yield',
      'static','get','set','constructor','true','false','null','undefined'
    ]);

    while (pos < len) {
      let ch = code[pos];

      // Skip whitespace
      if (/\s/.test(ch)) { pos++; continue; }

      // Skip comments
      if (ch === '/' && code[pos + 1] === '/') {
        while (pos < len && code[pos] !== '\n') pos++;
        continue;
      }
      if (ch === '/' && code[pos + 1] === '*') {
        pos += 2;
        while (pos < len && !(code[pos] === '*' && code[pos + 1] === '/')) pos++;
        pos += 2;
        continue;
      }

      // Strings
      if (ch === '"' || ch === "'" || ch === '`') {
        const quote = ch;
        let str = ch;
        pos++;
        while (pos < len && code[pos] !== quote) {
          if (code[pos] === '\\') { str += code[pos]; pos++; }
          str += code[pos];
          pos++;
        }
        str += quote;
        pos++;
        tokens.push({ type: 'string', value: str, raw: str });
        continue;
      }

      // Numbers
      if (/\d/.test(ch)) {
        let num = '';
        while (pos < len && /[\d.]/.test(code[pos])) { num += code[pos]; pos++; }
        tokens.push({ type: 'number', value: parseFloat(num), raw: num });
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_$]/.test(ch)) {
        let id = '';
        while (pos < len && /[a-zA-Z0-9_$]/.test(code[pos])) { id += code[pos]; pos++; }
        const type = keywords.has(id) ? 'keyword' : 'identifier';
        tokens.push({ type, value: id, raw: id });
        continue;
      }

      // Operators and punctuation
      const ops = ['=>','===','!==','==','!=','<=','>=','++','--','&&','||','**','<<','>>','>>>','+=','-=','*=','/=','%=','&=','|=','^=','<<=','>>=','>>>='];
      let found = false;
      for (const op of ops.sort((a,b) => b.length - a.length)) {
        if (code.slice(pos, pos + op.length) === op) {
          tokens.push({ type: 'operator', value: op, raw: op });
          pos += op.length;
          found = true;
          break;
        }
      }
      if (found) continue;

      // Single char tokens
      tokens.push({ type: 'punct', value: ch, raw: ch });
      pos++;
    }

    return tokens;
  }

  _parseJSTokens(tokens, filename) {
    const ast = {
      type: 'Program',
      filename,
      body: [],
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: [],
      meta: { lineCount: 0, complexity: 0 }
    };

    let pos = 0;
    const len = tokens.length;

    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];
    const expect = (type, value) => {
      const t = peek();
      if (!t || t.type !== type || (value && t.value !== value)) {
        throw new Error('Expected ' + type + (value ? ' ' + value : '') + ' got ' + (t ? t.raw : 'EOF'));
      }
      return consume();
    };

    const parseStatement = () => {
      const t = peek();
      if (!t) return null;

      // Import declaration
      if (t.type === 'keyword' && t.value === 'import') {
        return parseImport();
      }

      // Export declaration
      if (t.type === 'keyword' && t.value === 'export') {
        return parseExport();
      }

      // Function declaration
      if (t.type === 'keyword' && t.value === 'function') {
        return parseFunction();
      }

      // Class declaration
      if (t.type === 'keyword' && t.value === 'class') {
        return parseClass();
      }

      // Variable declaration
      if (t.type === 'keyword' && ['const','let','var'].includes(t.value)) {
        return parseVariable();
      }

      // Async function
      if (t.type === 'keyword' && t.value === 'async') {
        pos++;
        const next = peek();
        if (next && next.type === 'keyword' && next.value === 'function') {
          return parseFunction(true);
        }
        pos--; // backtrack
      }

      // Expression or other
      return parseExpression();
    };

    const parseImport = () => {
      consume(); // 'import'
      const node = { type: 'ImportDeclaration', specifiers: [], source: '' };

      // import { a, b } from 'x'
      // import x from 'y'
      // import * as x from 'y'
      const t = peek();
      if (t && t.type === 'punct' && t.value === '{') {
        consume(); // '{'
        while (peek() && !(peek().type === 'punct' && peek().value === '}')) {
          const spec = consume();
          if (spec.type === 'identifier') {
            node.specifiers.push({ type: 'named', name: spec.value });
          }
          if (peek() && peek().type === 'punct' && peek().value === ',') consume();
        }
        expect('punct', '}');
      } else if (t && t.type === 'keyword' && t.value === '*') {
        consume(); // '*'
        expect('keyword', 'as');
        const name = expect('identifier');
        node.specifiers.push({ type: 'namespace', name: name.value });
      } else if (t && t.type === 'identifier') {
        const name = consume();
        node.specifiers.push({ type: 'default', name: name.value });
      }

      expect('keyword', 'from');
      const source = expect('string');
      node.source = source.value;

      if (peek() && peek().type === 'punct' && peek().value === ';') consume();

      ast.imports.push(node);
      return node;
    };

    const parseExport = () => {
      consume(); // 'export'
      const node = { type: 'ExportDeclaration', declaration: null };

      const t = peek();
      if (t && t.type === 'keyword' && t.value === 'default') {
        consume();
        node.default = true;
        node.declaration = parseStatement();
      } else if (t && t.type === 'punct' && t.value === '{') {
        consume(); // '{'
        node.specifiers = [];
        while (peek() && !(peek().type === 'punct' && peek().value === '}')) {
          const spec = consume();
          if (spec.type === 'identifier') {
            node.specifiers.push({ name: spec.value });
          }
          if (peek() && peek().type === 'punct' && peek().value === ',') consume();
        }
        expect('punct', '}');
        if (peek() && peek().type === 'keyword' && peek().value === 'from') {
          consume();
          node.source = expect('string').value;
        }
      } else {
        node.declaration = parseStatement();
      }

      ast.exports.push(node);
      return node;
    };

    const parseFunction = (isAsync = false) => {
      consume(); // 'function'
      const node = {
        type: 'FunctionDeclaration',
        async: isAsync,
        name: '',
        params: [],
        body: [],
        codon: 0
      };

      const name = peek();
      if (name && name.type === 'identifier') {
        node.name = consume().value;
      }

      expect('punct', '(');
      while (peek() && !(peek().type === 'punct' && peek().value === ')')) {
        const param = consume();
        if (param.type === 'identifier') {
          node.params.push({ name: param.value });
        }
        if (peek() && peek().type === 'punct' && peek().value === ',') consume();
        if (peek() && peek().type === 'punct' && peek().value === '=') {
          consume(); // '='
          // Skip default value
          let depth = 0;
          while (peek()) {
            const t = peek();
            if (t.value === '(' || t.value === '{' || t.value === '[') depth++;
            if (t.value === ')' || t.value === '}' || t.value === ']') {
              if (depth === 0) break;
              depth--;
            }
            if (t.value === ',' && depth === 0) break;
            consume();
          }
        }
      }
      expect('punct', ')');

      // Parse body
      expect('punct', '{');
      let depth = 1;
      while (peek() && depth > 0) {
        const t = peek();
        if (t.value === '{' || t.value === '(' || t.value === '[') depth++;
        if (t.value === '}' || t.value === ')' || t.value === ']') depth--;
        if (depth > 0) {
          const stmt = parseStatement();
          if (stmt) node.body.push(stmt);
        } else {
          consume(); // '}'
        }
      }

      // Derive codon from function characteristics
      node.codon = this._deriveFunctionCodon(node);

      ast.functions.push(node);
      ast.meta.complexity += node.params.length + node.body.length;
      return node;
    };

    const parseClass = () => {
      consume(); // 'class'
      const node = {
        type: 'ClassDeclaration',
        name: '',
        superClass: null,
        methods: [],
        properties: [],
        codon: 0
      };

      const name = peek();
      if (name && name.type === 'identifier') {
        node.name = consume().value;
      }

      if (peek() && peek().type === 'keyword' && peek().value === 'extends') {
        consume();
        const superName = peek();
        if (superName && superName.type === 'identifier') {
          node.superClass = consume().value;
        }
      }

      expect('punct', '{');
      while (peek() && !(peek().type === 'punct' && peek().value === '}')) {
        const t = peek();
        let isStatic = false;
        let isAsync = false;
        let isGetter = false;
        let isSetter = false;

        if (t.type === 'keyword' && t.value === 'static') { consume(); isStatic = true; }
        if (t.type === 'keyword' && t.value === 'async') { consume(); isAsync = true; }
        if (t.type === 'keyword' && t.value === 'get') { consume(); isGetter = true; }
        if (t.type === 'keyword' && t.value === 'set') { consume(); isSetter = true; }

        const methodName = consume();
        if (methodName.type === 'identifier') {
          const method = {
            type: 'MethodDefinition',
            name: methodName.value,
            static: isStatic,
            async: isAsync,
            kind: isGetter ? 'get' : isSetter ? 'set' : 'method',
            params: [],
            body: []
          };

          expect('punct', '(');
          while (peek() && !(peek().type === 'punct' && peek().value === ')')) {
            const param = consume();
            if (param.type === 'identifier') {
              method.params.push({ name: param.value });
            }
            if (peek() && peek().type === 'punct' && peek().value === ',') consume();
          }
          expect('punct', ')');

          expect('punct', '{');
          let depth = 1;
          while (peek() && depth > 0) {
            const t2 = peek();
            if (t2.value === '{') depth++;
            if (t2.value === '}') depth--;
            if (depth > 0) {
              const stmt = parseStatement();
              if (stmt) method.body.push(stmt);
            } else {
              consume();
            }
          }

          node.methods.push(method);
        }
      }
      expect('punct', '}');

      node.codon = this._deriveClassCodon(node);
      ast.classes.push(node);
      ast.meta.complexity += node.methods.length;
      return node;
    };

    const parseVariable = () => {
      const kind = consume(); // const/let/var
      const node = {
        type: 'VariableDeclaration',
        kind: kind.value,
        declarations: []
      };

      do {
        const name = expect('identifier');
        const decl = { name: name.value, init: null };

        if (peek() && peek().type === 'punct' && peek().value === '=') {
          consume(); // '='
          // Parse init value (simplified)
          let initTokens = [];
          let depth = 0;
          while (peek()) {
            const t = peek();
            if (t.value === '(' || t.value === '{' || t.value === '[') depth++;
            if (t.value === ')' || t.value === '}' || t.value === ']') {
              if (depth === 0) break;
              depth--;
            }
            if ((t.value === ',' || t.value === ';') && depth === 0) break;
            initTokens.push(consume());
          }
          decl.init = initTokens.map(t => t.raw).join('');
        }

        node.declarations.push(decl);
        ast.variables.push(decl);
      } while (peek() && peek().type === 'punct' && peek().value === ',' && consume());

      if (peek() && peek().type === 'punct' && peek().value === ';') consume();

      return node;
    };

    const parseExpression = () => {
      // Simplified expression parsing
      const tokens = [];
      let depth = 0;
      while (peek()) {
        const t = peek();
        if (t.value === '(' || t.value === '{' || t.value === '[') depth++;
        if (t.value === ')' || t.value === '}' || t.value === ']') {
          if (depth === 0) break;
          depth--;
        }
        if ((t.value === ';' || t.value === ',') && depth === 0) break;
        tokens.push(consume());
      }

      if (peek() && peek().type === 'punct' && peek().value === ';') consume();

      return {
        type: 'ExpressionStatement',
        tokens: tokens.map(t => ({ type: t.type, value: t.value })),
        raw: tokens.map(t => t.raw).join('')
      };
    };

    // Parse all statements
    while (pos < len) {
      const stmt = parseStatement();
      if (stmt) ast.body.push(stmt);
      else break;
    }

    ast.meta.lineCount = code.split('\n').length;
    return ast;
  }

  _deriveFunctionCodon(fn) {
    // Hash based on function characteristics
    let hash = fn.name.length * 3 + fn.params.length * 7 + fn.body.length * 11;
    if (fn.async) hash += 13;
    hash = hash % 64;
    return hash;
  }

  _deriveClassCodon(cls) {
    let hash = cls.name.length * 5 + cls.methods.length * 9;
    if (cls.superClass) hash += 17;
    hash = hash % 64;
    return hash;
  }

  /* ═══════════════════════════════════════════════════════════════
     CSS PARSER — Rule extraction with selector analysis
     ═══════════════════════════════════════════════════════════════ */
  parseCSS(code, filename = 'unknown') {
    const ast = {
      type: 'Stylesheet',
      filename,
      rules: [],
      imports: [],
      variables: [],
      meta: { ruleCount: 0, selectorCount: 0 }
    };

    // Remove comments
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    code = code.replace(/\/\/.*/g, '');

    // Parse @import
    const importMatches = code.match(/@import\s+([^;]+);/g) || [];
    importMatches.forEach(imp => {
      const url = imp.match(/['"]([^'"]+)['"]/) || imp.match(/url\(([^)]+)\)/);
      ast.imports.push({ type: 'import', url: url ? url[1] : '' });
    });

    // Parse CSS variables
    const varMatches = code.match(/--[\w-]+\s*:/g) || [];
    varMatches.forEach(v => {
      ast.variables.push({ name: v.replace(':', '').trim() });
    });

    // Parse rules (simplified)
    let depth = 0;
    let current = '';
    let inRule = false;

    for (let i = 0; i < code.length; i++) {
      const ch = code[i];

      if (ch === '{') {
        if (depth === 0) {
          const selector = current.trim();
          current = '';
          inRule = true;

          const rule = {
            type: 'Rule',
            selector,
            declarations: [],
            codon: this._deriveSelectorCodon(selector)
          };
          ast.rules.push(rule);
          ast.meta.selectorCount++;
        }
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && inRule) {
          // Parse declarations in current
          const decls = current.split(';').filter(d => d.trim());
          decls.forEach(decl => {
            const colon = decl.indexOf(':');
            if (colon > 0) {
              const prop = decl.slice(0, colon).trim();
              const val = decl.slice(colon + 1).trim();
              ast.rules[ast.rules.length - 1].declarations.push({
                property: prop,
                value: val
              });
            }
          });
          current = '';
          inRule = false;
          ast.meta.ruleCount++;
        }
      } else {
        current += ch;
      }
    }

    return ast;
  }

  _deriveSelectorCodon(selector) {
    let hash = 0;
    for (let i = 0; i < selector.length; i++) {
      hash = (hash + selector.charCodeAt(i) * (i + 1)) % 64;
    }
    return hash;
  }

  /* ═══════════════════════════════════════════════════════════════
     VUE/SVELTE PARSER — SFC structure extraction
     ═══════════════════════════════════════════════════════════════ */
  parseSFC(code, filename, type = 'vue') {
    const ast = {
      type: type === 'vue' ? 'VueSFC' : 'SvelteComponent',
      filename,
      template: null,
      script: null,
      styles: [],
      meta: { hasScript: false, hasTemplate: false, styleCount: 0 }
    };

    if (type === 'vue') {
      // Parse Vue SFC blocks
      const templateMatch = code.match(/<template>([\s\S]*?)<\/template>/);
      if (templateMatch) {
        ast.template = {
          type: 'Template',
          content: templateMatch[1],
          codon: this._deriveCodon(templateMatch[1])
        };
        ast.meta.hasTemplate = true;
      }

      const scriptMatch = code.match(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/);
      if (scriptMatch) {
        ast.script = this.parseJS(scriptMatch[1], filename + ':script');
        ast.meta.hasScript = true;
      }

      const styleMatches = code.matchAll(/<style(?:\s+[^>]*)?>([\s\S]*?)<\/style>/g);
      for (const match of styleMatches) {
        ast.styles.push({
          type: 'Style',
          scoped: match[0].includes('scoped'),
          content: match[1],
          ast: this.parseCSS(match[1], filename + ':style')
        });
        ast.meta.styleCount++;
      }
    } else if (type === 'svelte') {
      // Parse Svelte: template + script + style
      const scriptMatch = code.match(/<script>([\s\S]*?)<\/script>/);
      if (scriptMatch) {
        ast.script = this.parseJS(scriptMatch[1], filename + ':script');
        ast.meta.hasScript = true;
      }

      const styleMatch = code.match(/<style>([\s\S]*?)<\/style>/);
      if (styleMatch) {
        ast.styles.push({
          type: 'Style',
          content: styleMatch[1],
          ast: this.parseCSS(styleMatch[1], filename + ':style')
        });
        ast.meta.styleCount++;
      }

      // Everything else is template
      let template = code;
      if (scriptMatch) template = template.replace(scriptMatch[0], '');
      if (styleMatch) template = template.replace(styleMatch[0], '');
      ast.template = {
        type: 'Template',
        content: template,
        codon: this._deriveCodon(template)
      };
      ast.meta.hasTemplate = true;
    }

    return ast;
  }

  _deriveCodon(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash + str.charCodeAt(i) * (i + 1)) % 64;
    }
    return hash;
  }

  /* ═══════════════════════════════════════════════════════════════
     UNIVERSAL PARSE — Routes to correct parser based on file type
     ═══════════════════════════════════════════════════════════════ */
  parse(code, filename, ext) {
    switch (ext) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return this.parseJS(code, filename);
      case 'css':
      case 'scss':
      case 'less':
        return this.parseCSS(code, filename);
      case 'vue':
        return this.parseSFC(code, filename, 'vue');
      case 'svelte':
        return this.parseSFC(code, filename, 'svelte');
      default:
        return this.parseJS(code, filename); // Fallback
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     AST TO CONTRACT — Convert AST into substrate-compatible contract
     ═══════════════════════════════════════════════════════════════ */
  astToContract(ast, filename) {
    const contract = {
      id: 'ast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      src: filename,
      type: this._detectASTType(ast),
      ast: ast,
      els: this._flattenAST(ast),
      meta: {
        nodes: this._countASTNodes(ast),
        depth: this._depthAST(ast),
        complexity: this._complexityAST(ast),
        t: Date.now()
      },
      codon: this._deriveCodon(JSON.stringify(ast)),
      archetype: null,
      quality: null
    };

    const rule = this.codonRules[contract.codon % 64];
    contract.archetype = rule.archetype;
    contract.quality = rule.quality;

    return contract;
  }

  _detectASTType(ast) {
    if (ast.type === 'Program') return 'app';
    if (ast.type === 'Stylesheet') return 'style';
    if (ast.type === 'VueSFC') return 'app';
    if (ast.type === 'SvelteComponent') return 'app';
    return 'page';
  }

  _flattenAST(ast, depth = 0, result = []) {
    if (!ast || typeof ast !== 'object') return result;

    const node = {
      type: ast.type || 'unknown',
      depth,
      hasKids: false,
      text: '',
      codon: 0
    };

    if (ast.type === 'FunctionDeclaration') {
      node.tag = 'function';
      node.attrs = { name: ast.name, async: ast.async, params: ast.params.length };
      node.text = ast.name + '(' + ast.params.map(p => p.name).join(', ') + ')';
      node.codon = ast.codon || 0;
      result.push(node);
      ast.body.forEach(child => this._flattenAST(child, depth + 1, result));
    } else if (ast.type === 'ClassDeclaration') {
      node.tag = 'class';
      node.attrs = { name: ast.name, extends: ast.superClass, methods: ast.methods.length };
      node.text = ast.name + (ast.superClass ? ' extends ' + ast.superClass : '');
      node.codon = ast.codon || 0;
      result.push(node);
      ast.methods.forEach(method => this._flattenAST(method, depth + 1, result));
    } else if (ast.type === 'MethodDefinition') {
      node.tag = 'method';
      node.attrs = { name: ast.name, static: ast.static, async: ast.async };
      node.text = ast.name + '()';
      result.push(node);
      ast.body.forEach(child => this._flattenAST(child, depth + 1, result));
    } else if (ast.type === 'Rule') {
      node.tag = 'rule';
      node.attrs = { selector: ast.selector, declarations: ast.declarations.length };
      node.text = ast.selector;
      node.codon = ast.codon || 0;
      result.push(node);
    } else if (ast.body && Array.isArray(ast.body)) {
      result.push(node);
      ast.body.forEach(child => this._flattenAST(child, depth + 1, result));
    } else {
      result.push(node);
    }

    return result;
  }

  _countASTNodes(ast) {
    if (!ast || typeof ast !== 'object') return 0;
    let count = 1;
    if (ast.body && Array.isArray(ast.body)) {
      count += ast.body.reduce((sum, child) => sum + this._countASTNodes(child), 0);
    }
    if (ast.methods && Array.isArray(ast.methods)) {
      count += ast.methods.reduce((sum, m) => sum + this._countASTNodes(m), 0);
    }
    if (ast.rules && Array.isArray(ast.rules)) {
      count += ast.rules.length;
    }
    if (ast.declarations && Array.isArray(ast.declarations)) {
      count += ast.declarations.length;
    }
    return count;
  }

  _depthAST(ast, d = 0) {
    if (!ast || typeof ast !== 'object') return d;
    let max = d;
    if (ast.body && Array.isArray(ast.body)) {
      max = Math.max(max, ...ast.body.map(child => this._depthAST(child, d + 1)));
    }
    if (ast.methods && Array.isArray(ast.methods)) {
      max = Math.max(max, ...ast.methods.map(m => this._depthAST(m, d + 1)));
    }
    return max;
  }

  _complexityAST(ast) {
    let score = 0;
    if (ast.functions) score += ast.functions.length * 3;
    if (ast.classes) score += ast.classes.length * 5;
    if (ast.imports) score += ast.imports.length;
    if (ast.rules) score += ast.rules.length * 2;
    if (ast.methods) score += ast.methods.length * 2;
    if (ast.variables) score += ast.variables.length;
    return score;
  }

  /* ═══════════════════════════════════════════════════════════════
     VIZ — Render AST as visual tree
     ═══════════════════════════════════════════════════════════════ */
  viz(ast, filename) {
    const icons = {
      Program: '📜', FunctionDeclaration: '⚡', ClassDeclaration: '🏛', MethodDefinition: '🔧',
      VariableDeclaration: '📦', ImportDeclaration: '📥', ExportDeclaration: '📤',
      ExpressionStatement: '💬', Rule: '🎨', Stylesheet: '🖌',
      VueSFC: '💚', SvelteComponent: '🧡', Template: '📄', Style: '🎭'
    };

    const build = (node, d = 0) => {
      const indent = '  '.repeat(d);
      const icon = icons[node.type] || '•';
      let text = icon + ' ' + node.type;

      if (node.name) text += ': ' + node.name;
      if (node.selector) text += ': ' + node.selector;
      if (node.kind) text += ' (' + node.kind + ')';

      let html = '<div class="mir-node" style="padding-left:' + (d * 14) + 'px"><span class="mir-tag">' + text + '</span>';
      if (node.attrs && Object.keys(node.attrs).length) {
        html += '<span class="mir-attr"> ' + Object.keys(node.attrs).length + 'a</span>';
      }
      html += '</div>';

      let kids = '';
      if (node.body && Array.isArray(node.body)) {
        kids = node.body.map(child => build(child, d + 1)).join('');
      }
      if (node.methods && Array.isArray(node.methods)) {
        kids += node.methods.map(m => build(m, d + 1)).join('');
      }
      if (node.rules && Array.isArray(node.rules)) {
        kids += node.rules.map(r => build(r, d + 1)).join('');
      }

      return html + kids;
    };

    return '<div class="mir-panel"><div class="mir-head"><span>📄 ' + filename + '</span><span class="mir-mode on">' + ast.type + '</span></div><div class="mir-body">' + build(ast) + '</div></div>';
  }
}

/* Export */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MorphAST };
}
