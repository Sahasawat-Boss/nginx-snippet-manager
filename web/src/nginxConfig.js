const TOKEN =
  /(?<comment>#.*)|(?<string>"(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?)|(?<variable>\$\{?\w+\}?)|(?<punctuation>[{};])|(?<space>\s+)|(?<word>[^\s{};"'$]+|.)/g;

const CLOSED_STRING = /^"(?:\\.|[^"\\])*"$|^'(?:\\.|[^'\\])*'$/;
const NUMBER = /^\d+[kmgshdwyKMG]?$/;
const KEYWORD = /^(on|off)$/;

function classifyWord(text, startsStatement) {
  if (startsStatement) return 'directive';
  if (KEYWORD.test(text)) return 'keyword';
  if (NUMBER.test(text)) return 'number';
  return 'word';
}

// Returns one array of { type, text } per line. The tokens of a line always
// join back into that line, so the result can be rendered as-is.
export function tokenizeConfig(source) {
  let startsStatement = true;

  return source.split(/\r?\n/).map((line) =>
    [...line.matchAll(TOKEN)].map((match) => {
      const [text] = match;
      const type = Object.keys(match.groups).find((name) => match.groups[name] !== undefined);

      if (type === 'punctuation') {
        startsStatement = true;
        return { type, text };
      }
      if (type === 'comment' || type === 'space') return { type, text };

      const wasStart = startsStatement;
      startsStatement = false;
      if (type === 'word') return { type: classifyWord(text, wasStart), text };
      if (type === 'string') return { type, text, unclosed: !CLOSED_STRING.test(text) };
      return { type, text };
    }),
  );
}

const WEAK_TLS = new Set(['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1.1']);

function adviceFor(words) {
  const [directive, ...args] = words;
  if (directive === 'autoindex' && args[0] === 'on') {
    return 'autoindex on จะแสดงรายชื่อไฟล์ในโฟลเดอร์ให้ทุกคนเห็น';
  }
  if (directive === 'server_tokens' && args[0] === 'on') {
    return 'server_tokens on จะเปิดเผยเวอร์ชันของ nginx';
  }
  if (directive === 'ssl_protocols' && args.some((arg) => WEAK_TLS.has(arg))) {
    return 'ssl_protocols มีเวอร์ชันเก่าที่ไม่ปลอดภัย ควรใช้ TLSv1.2 ขึ้นไป';
  }
  return null;
}

// A quick structural check for use while typing. It does not know which
// directives exist, so it complements `nginx -t` rather than replacing it.
export function lintConfig(source) {
  const issues = [];
  const report = (level, line, message) => issues.push({ level, line, message });
  const openBraces = [];
  let statement = null;

  tokenizeConfig(source).forEach((tokens, index) => {
    const line = index + 1;
    let firstOnLine = true;

    for (const token of tokens) {
      if (token.type === 'space' || token.type === 'comment') continue;

      if (token.type === 'punctuation') {
        if (token.text === '{') {
          openBraces.push(line);
        } else if (token.text === ';') {
          if (statement) {
            const advice = adviceFor(statement.words);
            if (advice) report('warning', statement.line, advice);
          }
        } else {
          if (statement) report('error', statement.lastLine, 'คำสั่งนี้ไม่ได้ปิดท้ายด้วย ;');
          if (openBraces.length) openBraces.pop();
          else report('error', line, 'มี } เกินมา ไม่มี { ที่จับคู่กัน');
        }
        statement = null;
      } else {
        if (token.unclosed) report('warning', line, 'เครื่องหมายคำพูดไม่ได้ปิดในบรรทัดนี้');

        if (!statement) {
          statement = { line, lastLine: line, words: [] };
        } else if (firstOnLine && token.type !== 'string' && token.type !== 'variable') {
          report('warning', statement.lastLine, 'บรรทัดนี้อาจลืมใส่ ; ท้ายคำสั่ง');
        }
        statement.words.push(token.text);
        statement.lastLine = line;
      }
      firstOnLine = false;
    }
  });

  if (statement) report('error', statement.lastLine, 'คำสั่งสุดท้ายไม่ได้ปิดท้ายด้วย ;');
  for (const line of openBraces) report('error', line, 'เปิด { แล้วไม่ได้ปิดด้วย }');

  return issues.sort((a, b) => a.line - b.line);
}
