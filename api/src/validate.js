export const LIMITS = { title: 120, description: 500, content: 20000, tags: 10 };

const TAG_PATTERN = /^[a-z0-9][a-z0-9-]{0,29}$/;

// Returns { value } when valid, or { errors: { field: message } } when not.
export function validateSnippet(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { body: 'ต้องส่งข้อมูลเป็น JSON object' } };
  }

  const errors = {};

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) errors.title = 'กรุณากรอกชื่อ';
  else if (title.length > LIMITS.title) errors.title = `ชื่อยาวได้ไม่เกิน ${LIMITS.title} ตัวอักษร`;

  const rawDescription = body.description ?? '';
  const description = typeof rawDescription === 'string' ? rawDescription.trim() : '';
  if (typeof rawDescription !== 'string') errors.description = 'คำอธิบายต้องเป็นข้อความ';
  else if (description.length > LIMITS.description) {
    errors.description = `คำอธิบายยาวได้ไม่เกิน ${LIMITS.description} ตัวอักษร`;
  }

  const content = typeof body.content === 'string' ? body.content.trimEnd() : '';
  if (!content.trim()) errors.content = 'กรุณากรอก config';
  else if (content.length > LIMITS.content) errors.content = `config ยาวได้ไม่เกิน ${LIMITS.content} ตัวอักษร`;

  const rawTags = body.tags ?? [];
  let tags = [];
  if (!Array.isArray(rawTags) || rawTags.some((tag) => typeof tag !== 'string')) {
    errors.tags = 'tags ต้องเป็น array ของข้อความ';
  } else {
    tags = [...new Set(rawTags.map((tag) => tag.trim().toLowerCase()))];
    if (tags.length > LIMITS.tags) errors.tags = `ใส่ tag ได้ไม่เกิน ${LIMITS.tags} รายการ`;
    else if (tags.some((tag) => !TAG_PATTERN.test(tag))) {
      errors.tags = 'tag ใช้ได้เฉพาะ a-z, 0-9 และ - ยาวไม่เกิน 30 ตัวอักษร';
    }
  }

  if (Object.keys(errors).length) return { errors };
  return { value: { title, description, content, tags } };
}

export function parseId(raw) {
  return /^[1-9]\d{0,14}$/.test(raw) ? Number(raw) : null;
}

// Returns the integer, the fallback when the param is absent, or null when invalid.
export function parseIntParam(raw, { fallback, max }) {
  if (raw === undefined) return fallback;
  if (typeof raw !== 'string' || !/^[1-9]\d{0,8}$/.test(raw)) return null;
  const value = Number(raw);
  return value <= max ? value : null;
}
