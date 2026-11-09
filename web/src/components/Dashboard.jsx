import { formatDate } from '../format.js';

export default function Dashboard({ stats, tags, onSelect, onSelectTag }) {
  const cards = [
    { label: 'Snippet ทั้งหมด', value: stats?.total },
    { label: 'รายการโปรด', value: stats?.favorites },
    { label: 'Tag', value: stats?.tags },
  ];

  return (
    <section className="dashboard">
      <header>
        <h2>ภาพรวม</h2>
        <p className="description">เลือก snippet จากรายการ หรือเพิ่ม config ชุดใหม่เก็บไว้ใช้ซ้ำ</p>
      </header>

      <dl className="stat-grid">
        {cards.map(({ label, value }) => (
          <div key={label} className="stat-card">
            <dt>{label}</dt>
            <dd>{value ?? '–'}</dd>
          </div>
        ))}
      </dl>

      {stats?.recent.length > 0 && (
        <div className="panel">
          <h3>แก้ไขล่าสุด</h3>
          <ul className="recent-list">
            {stats.recent.map((item) => (
              <li key={item.id}>
                <button type="button" className="recent-item" onClick={() => onSelect(item.id)}>
                  <span className="recent-title">
                    {item.favorite && <span className="star">★ </span>}
                    {item.title}
                  </span>
                  <time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tags.length > 0 && (
        <div className="panel">
          <h3>Tag ที่ใช้บ่อย</h3>
          <div className="tags">
            {tags.slice(0, 12).map(({ name, count }) => (
              <button key={name} type="button" className="tag" onClick={() => onSelectTag(name)}>
                {name} <span className="tag-count">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="shortcuts">
        คีย์ลัด: <kbd>/</kbd> ค้นหา · <kbd>n</kbd> เพิ่ม snippet
      </p>
    </section>
  );
}
