import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.js';
import { Phone, Mail, Globe, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { api } from '../services/api.js';

interface PageData {
  title: string;
  subtitle?: string;
  updatedAt: string;
  blocks: any[];
}

export const DocumentPage: React.FC<{ defaultSlug?: string }> = ({ defaultSlug }) => {
  const { slug } = useParams();
  const activeSlug = defaultSlug || slug;
  const navigate = useNavigate();
  
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<PageData>(`/pages/${activeSlug}`);
        setPage(res.data || null);
      } catch (err: any) {
        setError(err.message || 'Failed to load page. It may be unpublished or offline.');
      } finally {
        setLoading(false);
      }
    };
    if (activeSlug) fetchPage();
  }, [activeSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <AppHeader title="Loading..." />
        <div className="p-5 flex flex-col gap-4 animate-pulse">
          <div className="h-8 bg-borderLight rounded w-3/4"></div>
          <div className="h-4 bg-borderLight rounded w-1/2 mb-6"></div>
          <div className="h-4 bg-borderLight rounded w-full"></div>
          <div className="h-4 bg-borderLight rounded w-full"></div>
          <div className="h-4 bg-borderLight rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-bg">
        <AppHeader title="Error" />
        <div className="p-5 flex flex-col items-center justify-center pt-20 text-center">
          <AlertTriangle size={48} className="text-muted mb-4" />
          <h2 className="text-xl font-bold mb-2">Page Unavailable</h2>
          <p className="text-sm text-muted mb-6">{error}</p>
          <button onClick={() => navigate(-1)} className="pill-outline">Go Back</button>
        </div>
      </div>
    );
  }

  const renderBlock = (block: any, idx: number) => {
    switch (block.type) {
      case 'heading':
        if (block.level === 2) return <h2 key={idx} className="text-primary text-xl font-bold mt-8 mb-4">{block.text}</h2>;
        return <h3 key={idx} className="text-textMain text-lg font-bold mt-6 mb-3">{block.text}</h3>;
      
      case 'paragraph':
        // Extremely basic markdown bold replacement (safe HTML via regex)
        const parts = block.text.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={idx} className="text-sm text-muted leading-[1.75] mb-4">
            {parts.map((part: string, i: number) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-textMain font-bold">{part.slice(2, -2)}</strong>;
              }
              return <span key={i}>{part}</span>;
            })}
          </p>
        );

      case 'list':
        return (
          <ul key={idx} className={`mb-6 ${block.ordered ? 'list-decimal pl-5' : 'space-y-3'}`}>
            {block.items.map((item: any, i: number) => (
              <li key={i} className="text-sm text-muted leading-[1.75] flex items-start gap-2">
                {!block.ordered && <span className="text-primary mt-1">•</span>}
                <div>
                  {item.lead && <strong className="text-textMain font-bold mr-1">{item.lead}</strong>}
                  <span>{item.text}</span>
                </div>
              </li>
            ))}
          </ul>
        );

      case 'callout':
        const toneColors = {
          info: 'bg-blue-50 border-blue-200 text-blue-900',
          warning: 'bg-orange-50 border-orange-200 text-orange-900',
          danger: 'bg-failed-bg border-failed-text/30 text-failed-text'
        };
        const ToneIcon = block.tone === 'danger' ? AlertCircle : block.tone === 'warning' ? AlertTriangle : Info;
        return (
          <div key={idx} className={`p-4 rounded-xl border flex gap-3 mb-6 ${toneColors[block.tone as keyof typeof toneColors] || toneColors.info}`}>
            <ToneIcon size={20} className="shrink-0 mt-0.5" />
            <p className="text-xs font-medium leading-relaxed">{block.text}</p>
          </div>
        );

      case 'contactList':
        return (
          <div key={idx} className="flex flex-col gap-3 mb-6">
            {block.items.map((item: any, i: number) => {
              const Icon = item.kind === 'phone' ? Phone : item.kind === 'email' ? Mail : Globe;
              const href = item.kind === 'phone' ? `tel:${item.value}` : item.kind === 'email' ? `mailto:${item.value}` : item.value;
              return (
                <a key={i} href={href} className="card !p-3 flex items-center gap-3 active:scale-[0.98] transition-transform">
                  <div className="p-2 bg-primary/10 text-primary rounded-full"><Icon size={18}/></div>
                  <div>
                    <p className="text-xs text-muted font-bold uppercase tracking-wider">{item.label}</p>
                    <p className="font-semibold text-textMain">{item.value}</p>
                  </div>
                </a>
              );
            })}
          </div>
        );

      case 'iconList':
        return (
          <div key={idx} className="grid grid-cols-2 gap-3 mb-6">
            {block.items.map((item: any, i: number) => (
              <div key={i} className="bg-surface border border-borderLight rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-sm font-semibold">{item.text}</span>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-24">
      <AppHeader title={page.title} />

      <main className="px-5 pt-6">
        <h1 className="text-[28px] font-bold text-textMain leading-tight mb-2">{page.title}</h1>
        {page.subtitle && <p className="text-base text-muted mb-4">{page.subtitle}</p>}
        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-8">
          Last Updated: {new Date(page.updatedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>

        <div className="pb-10">
          {page.blocks.map((block, idx) => renderBlock(block, idx))}
        </div>
      </main>
    </div>
  );
};
