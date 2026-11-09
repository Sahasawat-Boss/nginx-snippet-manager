import { useMemo } from 'react';
import { lintConfig } from '../nginxConfig.js';

export default function ConfigCheck({ content, hideWhenClean = false }) {
  const issues = useMemo(() => lintConfig(content), [content]);

  if (issues.length === 0) {
    if (hideWhenClean || !content.trim()) return null;
    return <p className="check-ok">✓ โครงสร้าง config ดูถูกต้อง (ตรวจเบื้องต้น ควรยืนยันด้วย nginx -t)</p>;
  }

  return (
    <ul className="check-list" aria-label="ผลการตรวจ config">
      {issues.map(({ level, line, message }) => (
        <li key={`${line}-${message}`} className={`check-item ${level}`}>
          <span className="check-line">บรรทัด {line}</span>
          {message}
        </li>
      ))}
    </ul>
  );
}
