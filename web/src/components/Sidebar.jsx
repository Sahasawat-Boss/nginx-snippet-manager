export default function Sidebar({
  search,
  onSearch,
  searchRef,
  tags,
  activeTag,
  onSelectTag,
  favoritesOnly,
  favoriteCount,
  onToggleFavorites,
  list,
  selectedId,
  onSelect,
  onCreate,
  onPage,
}) {
  const pagination = list?.pagination;

  return (
    <aside className="sidebar">
      <header className="brand">
        <h1>Snippet Manager</h1>
        <button type="button" className="button primary" onClick={onCreate}>
          + เพิ่ม
        </button>
      </header>

      <input
        ref={searchRef}
        className="input"
        type="search"
        placeholder="ค้นหาชื่อ คำอธิบาย หรือ config"
        aria-label="ค้นหา snippet"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
      />

      <div className="tag-filter">
        <button
          type="button"
          className={`tag${favoritesOnly ? ' active' : ''}`}
          aria-pressed={favoritesOnly}
          onClick={onToggleFavorites}
        >
          ★ รายการโปรด <span className="tag-count">{favoriteCount ?? 0}</span>
        </button>
        {tags.map(({ name, count }) => (
          <button
            key={name}
            type="button"
            className={`tag${activeTag === name ? ' active' : ''}`}
            aria-pressed={activeTag === name}
            onClick={() => onSelectTag(activeTag === name ? null : name)}
          >
            {name} <span className="tag-count">{count}</span>
          </button>
        ))}
      </div>

      <ul className="snippet-list">
        {list?.data.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`snippet-item${item.id === selectedId ? ' selected' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <strong>
                {item.favorite && <em className="star">★ </em>}
                {item.title}
              </strong>
              {item.description && <span>{item.description}</span>}
            </button>
          </li>
        ))}
        {list?.data.length === 0 && <li className="list-empty">ไม่พบ snippet</li>}
      </ul>

      {pagination?.totalPages > 1 && (
        <nav className="pagination" aria-label="แบ่งหน้า">
          <button
            type="button"
            className="button ghost"
            disabled={pagination.page <= 1}
            onClick={() => onPage(pagination.page - 1)}
          >
            ก่อนหน้า
          </button>
          <span>
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            className="button ghost"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPage(pagination.page + 1)}
          >
            ถัดไป
          </button>
        </nav>
      )}
    </aside>
  );
}
