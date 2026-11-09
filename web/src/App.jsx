import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import Dashboard from './components/Dashboard.jsx';
import Sidebar from './components/Sidebar.jsx';
import SnippetDetail from './components/SnippetDetail.jsx';
import SnippetForm from './components/SnippetForm.jsx';

function idFromPath() {
  const match = window.location.pathname.match(/^\/snippets\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function isAbort(err) {
  return err.name === 'AbortError';
}

function isTyping(target) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export default function App() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [list, setList] = useState(null);
  const [tags, setTags] = useState([]);
  const [selectedId, setSelectedId] = useState(idFromPath);
  const [snippet, setSnippet] = useState(null);
  const [mode, setMode] = useState('view');
  const [draft, setDraft] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);
  const searchRef = useRef(null);

  const refresh = () => setRevision((value) => value + 1);

  function startCreate(initial = null) {
    setDraft(initial);
    setMode('create');
  }

  function navigate(id) {
    const path = id ? `/snippets/${id}` : '/';
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
    setSelectedId(id);
    setMode('view');
  }

  useEffect(() => {
    const onPopState = () => {
      setSelectedId(idFromPath());
      setMode('view');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === 'n' && mode === 'view') {
        // Only from view mode, so the shortcut cannot discard a form in progress.
        setDraft(null);
        setMode('create');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .listSnippets({ q: query, tag: activeTag, favorite: favoritesOnly, page }, controller.signal)
      .then((result) => {
        // Deleting the only item on the last page leaves this page empty.
        if (result.data.length === 0 && page > 1) {
          setPage(Math.max(result.pagination.totalPages, 1));
          return;
        }
        setList(result);
      })
      .catch((err) => {
        if (!isAbort(err)) setError(err.message);
      });
    return () => controller.abort();
  }, [query, activeTag, favoritesOnly, page, revision]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .getStats(controller.signal)
      .then(setStats)
      .catch((err) => {
        if (!isAbort(err)) setError(err.message);
      });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .listTags(controller.signal)
      .then((result) => {
        setTags(result.data);
        // A tag disappears once its last snippet is deleted or retagged.
        setActiveTag((tag) => (tag && !result.data.some(({ name }) => name === tag) ? null : tag));
      })
      .catch((err) => {
        if (!isAbort(err)) setError(err.message);
      });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (selectedId === null) {
      setSnippet(null);
      return undefined;
    }
    const controller = new AbortController();
    api
      .getSnippet(selectedId, controller.signal)
      .then(setSnippet)
      .catch((err) => {
        if (isAbort(err)) return;
        setSnippet(null);
        setError(err.message);
      });
    return () => controller.abort();
  }, [selectedId]);

  function selectTag(tag) {
    setActiveTag(tag);
    setPage(1);
  }

  function toggleFavoritesOnly() {
    setFavoritesOnly((value) => !value);
    setPage(1);
  }

  function handleDuplicate() {
    startCreate({ ...snippet, title: `${snippet.title} (สำเนา)`.slice(0, 120) });
  }

  async function handleToggleFavorite() {
    try {
      setSnippet(await api.setFavorite(snippet.id, !snippet.favorite));
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSave(values) {
    const saved = mode === 'edit' ? await api.updateSnippet(snippet.id, values) : await api.createSnippet(values);
    setSnippet(saved);
    navigate(saved.id);
    refresh();
  }

  async function handleDelete() {
    try {
      await api.deleteSnippet(snippet.id);
      navigate(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  let main;
  if (mode === 'create') {
    main = (
      <SnippetForm key={`create-${draft?.id ?? 'new'}`} draft={draft} onSave={handleSave} onCancel={() => setMode('view')} />
    );
  } else if (mode === 'edit' && snippet) {
    main = <SnippetForm key={snippet.id} snippet={snippet} onSave={handleSave} onCancel={() => setMode('view')} />;
  } else if (snippet) {
    main = (
      <SnippetDetail
        key={snippet.id}
        snippet={snippet}
        onEdit={() => setMode('edit')}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  } else {
    main = <Dashboard stats={stats} tags={tags} onSelect={navigate} onSelectTag={selectTag} />;
  }

  return (
    <div className="layout">
      <Sidebar
        search={search}
        onSearch={setSearch}
        searchRef={searchRef}
        tags={tags}
        activeTag={activeTag}
        onSelectTag={selectTag}
        favoritesOnly={favoritesOnly}
        favoriteCount={stats?.favorites}
        onToggleFavorites={toggleFavoritesOnly}
        list={list}
        selectedId={selectedId}
        onSelect={navigate}
        onCreate={() => startCreate()}
        onPage={setPage}
      />
      <main className="main">
        {error && (
          <div className="alert" role="alert">
            <span>{error}</span>
            <button type="button" className="button ghost" onClick={() => setError(null)}>
              ปิด
            </button>
          </div>
        )}
        {main}
      </main>
    </div>
  );
}
