import { useState } from 'react';

function parseTags(text) {
  return text
    .split(',')
    .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean);
}

export default function SnippetForm({ snippet, onSave, onCancel }) {
  const [title, setTitle] = useState(snippet?.title ?? '');
  const [description, setDescription] = useState(snippet?.description ?? '');
  const [content, setContent] = useState(snippet?.content ?? '');
  const [tags, setTags] = useState(snippet?.tags.join(', ') ?? '');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      await onSave({ title, description, content, tags: parseTags(tags) });
    } catch (err) {
      if (err.details) setErrors(err.details);
      else setFormError(err.message);
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h2>{snippet ? 'แก้ไข snippet' : 'เพิ่ม snippet ใหม่'}</h2>

      {formError && (
        <div className="alert" role="alert">
          {formError}
        </div>
      )}

      <label>
        ชื่อ
        <input
          className="input"
          value={title}
          maxLength={120}
          required
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
        />
        {errors.title && <small className="field-error">{errors.title}</small>}
      </label>

      <label>
        คำอธิบาย
        <input
          className="input"
          value={description}
          maxLength={500}
          onChange={(event) => setDescription(event.target.value)}
        />
        {errors.description && <small className="field-error">{errors.description}</small>}
      </label>

      <label>
        Config
        <textarea
          className="input code-input"
          value={content}
          rows={14}
          maxLength={20000}
          required
          spellCheck={false}
          onChange={(event) => setContent(event.target.value)}
        />
        {errors.content && <small className="field-error">{errors.content}</small>}
      </label>

      <label>
        Tags (คั่นด้วยเครื่องหมายจุลภาค)
        <input
          className="input"
          value={tags}
          placeholder="proxy, cache"
          onChange={(event) => setTags(event.target.value)}
        />
        {errors.tags && <small className="field-error">{errors.tags}</small>}
      </label>

      <div className="actions">
        <button type="submit" className="button primary" disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
        <button type="button" className="button ghost" onClick={onCancel}>
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
