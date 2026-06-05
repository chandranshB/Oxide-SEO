import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Database from '@tauri-apps/plugin-sql';
import { Button } from './Button';
import { Input } from './Input';
import { Folder01Icon, PlusSignIcon, ArrowDown01Icon, Globe02Icon, Delete01Icon, Settings01Icon } from 'hugeicons-react';

const Favicon = ({ domain }: { domain: string }) => {
  const [error, setError] = useState(false);
  if (error || !domain) {
    return <Globe02Icon size={16} />;
  }
  return (
    <img 
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} 
      alt="" 
      className="w-4 h-4 rounded-sm object-contain" 
      onError={() => setError(true)} 
    />
  );
};

export interface Project {
  id: number;
  domain: string;
}

interface ProjectSelectorProps {
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  isExpanded: boolean;
}

export function ProjectSelector({ activeProject, setActiveProject, isExpanded }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, project: Project } | null>(null);

  useEffect(() => {
    loadProjects();
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadProjects = async () => {
    try {
      const db = await Database.load('sqlite:seo_kit.db');
      const result: Project[] = await db.select('SELECT * FROM projects ORDER BY created_at DESC');
      setProjects(result);
      if (result.length > 0 && !activeProject) {
        setActiveProject(result[0]);
      }
    } catch (e) {
      console.error('Failed to load projects', e);
    }
  };

  const handleAddProject = async () => {
    if (!newDomain) return;
    try {
      // Ensure domain format is clean
      let cleanDomain = newDomain.trim();
      if (!cleanDomain.startsWith('http')) {
        cleanDomain = 'https://' + cleanDomain;
      }
      const url = new URL(cleanDomain);
      const domain = url.hostname;

      const db = await Database.load('sqlite:seo_kit.db');
      await db.execute('INSERT INTO projects (domain) VALUES ($1)', [domain]);
      setNewDomain('');
      setIsAdding(false);
      await loadProjects();
    } catch (e) {
      console.error('Failed to add project', e);
      alert('Invalid domain format');
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      const db = await Database.load('sqlite:seo_kit.db');
      await db.execute('DELETE FROM projects WHERE id = $1', [id]);
      if (activeProject?.id === id) {
        setActiveProject(null);
      }
      await loadProjects();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditProject = async (project: Project) => {
    const newDomain = prompt('Enter new domain:', project.domain);
    if (newDomain && newDomain !== project.domain) {
      try {
        let cleanDomain = newDomain.trim();
        if (!cleanDomain.startsWith('http')) {
          cleanDomain = 'https://' + cleanDomain;
        }
        const url = new URL(cleanDomain);
        const domain = url.hostname;

        const db = await Database.load('sqlite:seo_kit.db');
        await db.execute('UPDATE projects SET domain = $1 WHERE id = $2', [domain, project.id]);
        if (activeProject?.id === project.id) {
          setActiveProject({ ...project, domain });
        }
        await loadProjects();
      } catch (e) {
        console.error(e);
        alert('Invalid domain format');
      }
    }
  };

  if (!isExpanded) {
    return (
      <div className="flex justify-center p-4 border-b border-[var(--border-strong)]">
        <div className="w-10 h-10 bg-[var(--bg-base)] rounded-xl flex items-center justify-center border border-[var(--border-subtle)] text-[var(--accent-primary)] cursor-pointer overflow-hidden" onClick={() => setIsOpen(true)} title={activeProject?.domain || 'Select Project'}>
          {activeProject ? <Favicon domain={activeProject.domain} /> : <Folder01Icon size={18} />}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-[var(--border-strong)] relative z-20">
      <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">Active Project</div>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3 bg-[var(--bg-base)] border hover:border-[var(--border-strong)] transition-all text-left focus:outline-none relative ${isOpen ? 'rounded-t-xl border-[var(--border-strong)] border-b-transparent shadow-none z-10' : 'rounded-xl border-[var(--border-subtle)] z-10'}`}
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1 relative pr-6">
          <div className="p-1.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-lg shrink-0 flex items-center justify-center">
            {activeProject ? <Favicon domain={activeProject.domain} /> : <Folder01Icon size={16} />}
          </div>
          <span className="font-medium whitespace-nowrap text-sm text-zinc-200">
            {activeProject ? activeProject.domain : 'Select Project'}
          </span>
          {/* Shadow fade to acknowledge the arrow */}
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--bg-base)] via-[var(--bg-base)] to-transparent pointer-events-none" />
        </div>
        <div className="shrink-0 relative z-10 bg-[var(--bg-base)] pl-1">
          <ArrowDown01Icon size={16} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="bg-[var(--bg-base)] border border-[var(--border-strong)] border-t-0 rounded-b-xl">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveProject(p);
                  setIsOpen(false);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  setContextMenu({ x: e.clientX, y: e.clientY, project: p });
                }}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-3 ${activeProject?.id === p.id ? 'text-[var(--accent-primary)] font-medium bg-[var(--bg-surface)]/50' : 'text-zinc-300'}`}
              >
                <Favicon domain={p.domain} />
                <span className="truncate">{p.domain}</span>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-[var(--border-strong)] bg-[var(--bg-surface)]/30">
            {isAdding ? (
              <div className="flex gap-2">
                <Input 
                  value={newDomain} 
                  onChange={e => setNewDomain(e.target.value)} 
                  placeholder="example.com" 
                  className="flex-1 text-sm h-8 bg-[var(--bg-base)]"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleAddProject()}
                />
                <Button onClick={handleAddProject} className="h-8 px-3 text-xs">Add</Button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-[var(--accent-primary)] hover:text-white transition-colors py-1.5"
              >
                <PlusSignIcon size={16} />
                Add New Project
              </button>
            )}
          </div>
        </div>
      </div>

      {contextMenu && createPortal(
        <div 
          className="fixed z-50 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg shadow-xl overflow-hidden flex flex-col min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-[var(--border-strong)] bg-[var(--bg-base)]/50">
            <span className="text-xs font-semibold text-zinc-400 truncate block">{contextMenu.project.domain}</span>
          </div>
          <button 
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-200 hover:bg-[var(--bg-base)] hover:text-white transition-colors text-left"
            onClick={() => {
              handleEditProject(contextMenu.project);
              setContextMenu(null);
            }}
          >
            <Settings01Icon size={14} /> Edit Domain
          </button>
          <button 
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left"
            onClick={() => {
              handleDeleteProject(contextMenu.project.id);
              setContextMenu(null);
            }}
          >
            <Delete01Icon size={14} /> Delete Project
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
