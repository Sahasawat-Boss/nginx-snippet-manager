import { useEffect, useState } from 'react';
import { api } from './api.js';
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

export default function App() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [page, setPage] = useState(1);
  const [list, setList] = useState(null);
  const [tags, setTags] = useState([]);
  const [selectedId, setSelectedId] = useState(idFromPath);
  const [snippet, setSnippet] = useState(null);
  const [mode, setMode] = useState('view');
  const [error, setError] = useState(null);
  const [revision, setRevision] = useState(0);

  const refresh = () => setRevision((value) => value + 1);

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
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .listSnippets({ q: query, tag: activeTag, page }, controller.signal)
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
  }, [query, activeTag, page, revision]);

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
    main = <SnippetForm key="create" onSave={handleSave} onCancel={() => setMode('view')} />;
  } else if (mode === 'edit' && snippet) {
    main = <SnippetForm key={snippet.id} snippet={snippet} onSave={handleSave} onCancel={() => setMode('view')} />;
  } else if (snippet) {
    main = <SnippetDetail key={snippet.id} snippet={snippet} onEdit={() => setMode('edit')} onDelete={handleDelete} />;
  } else {
    main = (
      <div className="empty-state">
        <h2>เลือก snippet จากรายการ</h2>
        <p>หรือเพิ่ม config ชุดใหม่เก็บไว้ใช้ซ้ำ</p>
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar
        search={search}
        onSearch={setSearch}
        tags={tags}
        activeTag={activeTag}
        onSelectTag={selectTag}
        list={list}
        selectedId={selectedId}
        onSelect={navigate}
        onCreate={() => setMode('create')}
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
