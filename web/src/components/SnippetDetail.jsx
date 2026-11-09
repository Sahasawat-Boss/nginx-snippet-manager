import { useState } from 'react';

const dateFormat = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

export default function SnippetDetail({ snippet, onEdit, onDelete }) {
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

  return (
    <article className="detail">
      <header className="detail-header">
        <div>
          <h2>{snippet.title}</h2>
          {snippet.description && <p className="description">{snippet.description}</p>}
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
        <button type="button" className="button ghost copy" onClick={copy}>
          {copyLabel}
        </button>
        <pre>
          <code>{snippet.content}</code>
        </pre>
      </div>

      <footer className="meta">
        <div className="tags">
          {snippet.tags.map((tag) => (
            <span key={tag} className="tag static">
              {tag}
            </span>
          ))}
        </div>
        <time dateTime={snippet.updatedAt}>แก้ไขล่าสุด {dateFormat.format(new Date(snippet.updatedAt))}</time>
      </footer>
    </article>
  );
}
