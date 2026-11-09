const EXAMPLES = [
  {
    title: 'Reverse proxy ไปยัง backend',
    description: 'ส่งต่อ request ไปที่ upstream พร้อม header ที่ backend ต้องใช้',
    tags: ['proxy', 'upstream'],
    content: `upstream backend {
    server 127.0.0.1:3000;
    keepalive 16;
}

location /api/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}`,
  },
  {
    title: 'SPA fallback',
    description: 'ให้ทุก path ที่ไม่ใช่ไฟล์จริงกลับไปที่ index.html',
    tags: ['spa', 'static'],
    content: `location / {
    root /usr/share/nginx/html;
    try_files $uri /index.html;
}`,
  },
  {
    title: 'จำกัดจำนวน request',
    description: 'กัน request ที่ถี่เกินไปต่อ IP และตอบกลับด้วย 429',
    tags: ['security', 'rate-limit'],
    content: `# http {}
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;

# server {} / location {}
limit_req zone=api_limit burst=40 nodelay;
limit_req_status 429;`,
  },
  {
    title: 'เปิด gzip',
    description: 'บีบอัดไฟล์ข้อความเพื่อลดขนาดที่ส่งออกไป',
    tags: ['performance'],
    content: `gzip on;
gzip_min_length 1024;
gzip_types text/css application/javascript application/json image/svg+xml;`,
  },
];

export function seedSnippets(db) {
  const insert = db.prepare(
    `INSERT INTO snippets (title, description, content, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const now = new Date().toISOString();
  for (const { title, description, content, tags } of EXAMPLES) {
    insert.run(title, description, content, JSON.stringify(tags), now, now);
  }
}
