import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Database from '@tauri-apps/plugin-sql';
import { Button } from './Button';
import { Input } from './Input';
import { useToast } from './Toast';
import { Folder01Icon, PlusSignIcon, ArrowDown01Icon, Globe02Icon, Delete01Icon, Settings01Icon, Search01Icon } from 'hugeicons-react';

const Favicon = ({ domain, className = "w-7 h-7 rounded-lg object-contain" }: { domain: string, className?: string }) => {
  const [error, setError] = useState(false);
  if (error || !domain) {
    return <Globe02Icon size={24} className={className} />;
  }
  return (
    <img 
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} 
      alt="" 
      className={className} 
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
  const [isAuditing, setIsAuditing] = useState(false);
  const { error: showError } = useToast();

  useEffect(() => {
    loadProjects();
    const handleClickOutside = () => setContextMenu(null);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    const handleAuditStart = () => setIsAuditing(true);
    const handleAuditFinish = () => setIsAuditing(false);

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('audit-started', handleAuditStart);
    window.addEventListener('audit-finished', handleAuditFinish);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('audit-started', handleAuditStart);
      window.removeEventListener('audit-finished', handleAuditFinish);
    };
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
      showError('Invalid domain format');
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      const db = await Database.load('sqlite:seo_kit.db');
      
      // Cascade delete manually (in case PRAGMA foreign_keys is off)
      await db.execute(`
        DELETE FROM audit_pages 
        WHERE audit_id IN (SELECT id FROM audits WHERE project_id = $1)
      `, [id]);
      
      await db.execute('DELETE FROM audits WHERE project_id = $1', [id]);
      
      // Now delete the project
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
        showError('Invalid domain format');
      }
    }
  };

  if (!isExpanded) {
    return (
      <>
        <div className="flex justify-center p-4 border-b border-[var(--border-strong)] relative z-20">
          <div 
            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer overflow-hidden ${isOpen ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/30' : 'bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--accent-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)]'}`}
            onClick={() => {
              if (!isOpen && isAuditing) {
                 showError("A crawl is currently in progress! Please wait for it to finish or cancel it before switching projects.");
                 return;
              }
              setIsOpen(!isOpen);
            }} 
            title={activeProject?.domain || 'Select Project'}
          >
            {activeProject ? <Favicon domain={activeProject.domain} className="w-7 h-7 rounded object-contain" /> : <Folder01Icon size={20} />}
          </div>
        </div>

        {isOpen && createPortal(
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" 
              onClick={() => setIsOpen(false)}
            />
            <div 
              className="relative w-full max-w-2xl bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-[var(--border-strong)] flex items-center gap-3">
                <Search01Icon size={24} className="text-[var(--accent-primary)]" />
                <input 
                  type="text"
                  placeholder="Find a project or type a domain to add..."
                  className="bg-transparent border-none text-white w-full focus:outline-none text-xl placeholder:text-zinc-500 font-medium"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newDomain) handleAddProject();
                  }}
                  autoFocus
                />
                <div className="text-xs font-bold text-zinc-500 bg-[var(--bg-surface)] px-2 py-1 rounded-md border border-[var(--border-strong)] shadow-inner">ESC</div>
              </div>
              
              <div className="max-h-[50vh] overflow-y-auto p-3 custom-scrollbar">
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-3 pt-2">Projects</div>
                <div className="flex flex-col gap-1">
                  {projects.filter(p => p.domain.toLowerCase().includes(newDomain.toLowerCase())).map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActiveProject(p);
                        setIsOpen(false);
                        setNewDomain('');
                      }}
                      className={`w-full text-left px-4 py-3 text-base rounded-xl transition-all flex items-center justify-between group ${activeProject?.id === p.id ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shadow-sm' : 'text-zinc-300 hover:bg-[var(--bg-surface-hover)] hover:text-white'}`}
                    >
                      <div className="flex items-center gap-4">
                        <Favicon domain={p.domain} className="w-6 h-6 rounded object-contain shrink-0" />
                        <span className="font-semibold">{p.domain}</span>
                      </div>
                      {activeProject?.id === p.id && <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 px-2 py-0.5 rounded-full">Active</span>}
                    </button>
                  ))}
                  
                  {newDomain && projects.filter(p => p.domain.toLowerCase().includes(newDomain.toLowerCase())).length === 0 && (
                    <button 
                      onClick={handleAddProject}
                      className="w-full text-left px-4 py-4 mt-2 text-base rounded-xl transition-all flex items-center justify-between bg-[var(--accent-primary)] text-[var(--bg-base)] hover:bg-[var(--accent-primary-hover)] group shadow-lg shadow-[var(--accent-primary)]/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center bg-[var(--bg-base)]/20 rounded-lg">
                          <PlusSignIcon size={20} className="text-[var(--bg-base)]" />
                        </div>
                        <span className="font-bold">Add new project "{newDomain}"</span>
                      </div>
                      <span className="text-xs font-bold bg-[var(--bg-base)]/20 px-2 py-1 rounded-md">ENTER</span>
                    </button>
                  )}
                  {projects.length === 0 && !newDomain && (
                    <div className="text-center py-12">
                      <Folder01Icon size={48} className="mx-auto text-zinc-600 mb-4" />
                      <p className="text-zinc-400 font-medium text-lg mb-2">No projects yet</p>
                      <p className="text-zinc-500">Type a domain above to create your first project</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <div className="p-4 border-b border-[var(--border-strong)] relative z-20">
      <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">Active Project</div>
      <button 
        onClick={() => {
          if (!isOpen && isAuditing) {
             showError("A crawl is currently in progress! Please wait for it to finish or cancel it before switching projects.");
             return;
          }
          setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between p-3 bg-[var(--bg-base)] border hover:border-[var(--border-strong)] transition-all text-left focus:outline-none relative ${isOpen ? 'rounded-t-xl border-[var(--border-strong)] border-b-transparent shadow-none z-10' : 'rounded-xl border-[var(--border-subtle)] z-10'}`}
      >
        <div className="flex items-center gap-3 overflow-hidden flex-1 relative pr-6">
          {activeProject ? (
            <Favicon domain={activeProject.domain} className="w-7 h-7 rounded object-contain shrink-0" />
          ) : (
            <div className="w-8 h-8 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-lg shrink-0 flex items-center justify-center">
              <Folder01Icon size={16} />
            </div>
          )}
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
