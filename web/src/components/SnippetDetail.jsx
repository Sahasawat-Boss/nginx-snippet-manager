import { useState } from 'react';
import { formatDate } from '../format.js';
import CodeView from './CodeView.jsx';
import ConfigCheck from './ConfigCheck.jsx';

function fileNameFor(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'snippet'}.conf`;
}

export default function SnippetDetail({ snippet, onEdit, onDelete, onDuplicate, onToggleFavorite }) {
  const [copyLabel, setCopyLabel] = useState('คัดลอก');
  const [confirming, setConfirming] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet.content);
      setCopyLabel('คัดลอกแล้ว');
    } catch {
      setCopyLabel('คัดลอกไม่สำเร็จ');
    }
    setTimeout(() => setCopyLabel('คัดลอก'), 1500);
  }

  function download() {
    const url = URL.createObjectURL(new Blob([`${snippet.content}\n`], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileNameFor(snippet.title);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <article className="detail">
      <header className="detail-header">
        <div className="detail-title">
          <button
            type="button"
            className={`star-toggle${snippet.favorite ? ' on' : ''}`}
            aria-pressed={snippet.favorite}
            aria-label="รายการโปรด"
            title={snippet.favorite ? 'เอาออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
            onClick={onToggleFavorite}
          >
            {snippet.favorite ? '★' : '☆'}
          </button>
          <div>
            <h2>{snippet.title}</h2>
            {snippet.description && <p className="description">{snippet.description}</p>}
          </div>
        </div>
        <div className="actions">
          {confirming ? (
            <>
              <button type="button" className="button danger" onClick={onDelete}>
                ยืนยันการลบ
              </button>
              <button type="button" className="button ghost" onClick={() => setConfirming(false)}>
                ยกเลิก
              </button>
            </>
          ) : (
            <>
              <button type="button" className="button ghost" onClick={onDuplicate}>
                ทำสำเนา
              </button>
              <button type="button" className="button ghost" onClick={onEdit}>
                แก้ไข
              </button>
              <button type="button" className="button ghost" onClick={() => setConfirming(true)}>
                ลบ
              </button>
            </>
          )}
        </div>
      </header>

      <div className="code-block">
        <div className="code-actions">
          <button type="button" className="button ghost" onClick={download}>
            ดาวน์โหลด .conf
          </button>
          <button type="button" className="button ghost" onClick={copy}>
            {copyLabel}
          </button>
        </div>
        <CodeView content={snippet.content} />
      </div>

      <ConfigCheck content={snippet.content} hideWhenClean />

      <footer className="meta">
        <div className="tags">
          {snippet.tags.map((tag) => (
            <span key={tag} className="tag static">
              {tag}
            </span>
          ))}
        </div>
        <time dateTime={snippet.updatedAt}>แก้ไขล่าสุด {formatDate(snippet.updatedAt)}</time>
      </footer>
    </article>
  );
}
