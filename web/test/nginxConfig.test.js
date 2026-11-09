import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lintConfig, tokenizeConfig } from '../src/nginxConfig.js';

const typesOf = (line) => line.filter((token) => token.type !== 'space').map((token) => token.type);
const messagesAt = (issues) => issues.map(({ level, line }) => `${level}:${line}`);

test('tokens join back into the original lines', () => {
  const source = `# comment\nlocation ~ ^/a {\n  proxy_set_header Host "$host" ;\n  a 'unclosed\n}\n\n$ '`;
  const joined = tokenizeConfig(source).map((line) => line.map((token) => token.text).join(''));
  assert.deepEqual(joined, source.split('\n'));
});

test('classifies directives, values, and comments', () => {
  const [gzip, size, comment] = tokenizeConfig('gzip on;\nclient_max_body_size 10m;\n# note; {');
  assert.deepEqual(typesOf(gzip), ['directive', 'keyword', 'punctuation']);
  assert.deepEqual(typesOf(size), ['directive', 'number', 'punctuation']);
  assert.deepEqual(typesOf(comment), ['comment']);
});

test('does not treat a continuation line as a new directive', () => {
  const [, second] = tokenizeConfig(`log_format main 'a'\n  'b';`);
  assert.deepEqual(typesOf(second), ['string', 'punctuation']);
});

test('accepts well-formed configs, including multi-line values', () => {
  const source = `upstream backend {
    server 127.0.0.1:3000; # primary
}
log_format main '$remote_addr'
                '$status';
location / { try_files $uri /index.html; }`;
  assert.deepEqual(lintConfig(source), []);
});

test('reports a statement left open before a closing brace', () => {
  assert.deepEqual(messagesAt(lintConfig('server {\n  listen 80\n}')), ['error:2']);
});

test('reports a statement left open at the end of the text', () => {
  assert.deepEqual(messagesAt(lintConfig('gzip on')), ['error:1']);
});

test('warns when the next line looks like a new directive', () => {
  assert.deepEqual(messagesAt(lintConfig('gzip on\ngzip_vary on;')), ['warning:1']);
});

test('reports unbalanced braces on the right lines', () => {
  assert.deepEqual(messagesAt(lintConfig('server {\n  listen 80;\n')), ['error:1']);
  assert.deepEqual(messagesAt(lintConfig('listen 80;\n}')), ['error:2']);
});

test('warns about risky settings', () => {
  assert.deepEqual(messagesAt(lintConfig('autoindex on;')), ['warning:1']);
  assert.deepEqual(messagesAt(lintConfig('autoindex off;')), []);
  assert.deepEqual(messagesAt(lintConfig('ssl_protocols TLSv1 TLSv1.2;')), ['warning:1']);
  assert.deepEqual(messagesAt(lintConfig('ssl_protocols TLSv1.2 TLSv1.3;')), []);
});

test('ignores braces and semicolons inside comments and strings', () => {
  assert.deepEqual(lintConfig('# server {\nadd_header X "a;b{";'), []);
});
