import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader.js';
import { Search, ChevronRight, Phone, Mail, Clock, ShieldAlert } from 'lucide-react';
import { api } from '../services/api.js';
import { DownloadAppSection } from '../components/DownloadAppSection.js';

export const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<any>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<{ data: any }>('/support/config').then(res => setConfig(res.data?.data || null)).catch(() => {});
    api.get<{ data: any[] }>('/support/faqs').then(res => setFaqs(res.data?.data || [])).catch(() => {});
  }, []);

  const filteredFaqs = faqs.filter(f => f.question.toLowerCase().includes(search.toLowerCase()));
  const popularFaqs = faqs.filter(f => f.isPopular);

  return (
    <div className="min-h-screen bg-bg pb-24">
      <AppHeader title="Help & Support" />

      <main className="px-5 pt-6 flex flex-col gap-6">
        
        {/* Search */}
        <section>
          <h1 className="text-2xl font-bold text-textMain mb-4">How can we help you?</h1>
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input 
              type="text" 
              placeholder="Search for answers..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface border border-borderLight rounded-pill py-3 pl-12 pr-4 text-sm focus:border-primary shadow-sm"
            />
          </div>
        </section>

        {/* Emergency Support */}
        {config?.emergencyContacts && config.emergencyContacts.length > 0 && (
          <section className="bg-[#FFF3F3] border border-[#F8C9CF] rounded-2xl p-4 flex flex-col items-center text-center">
            <ShieldAlert size={28} className="text-failed-text mb-2" />
            <h3 className="font-bold text-failed-text mb-1">Emergency Support</h3>
            <p className="text-xs text-failed-text/80 font-medium mb-4">
              If you are in immediate danger, call local authorities first.
            </p>
            <div className="flex flex-col gap-2 w-full">
              {config.emergencyContacts.map((contact: any, i: number) => {
                const borderClass = contact.tone === 'danger' ? 'border-failed-text text-failed-text' : 
                                    contact.tone === 'pink' ? 'border-accent text-accent' : 
                                    'border-blue-500 text-blue-500';
                return (
                  <a 
                    key={i} 
                    href={`tel:${contact.number}`}
                    className={`w-full py-2.5 rounded-pill border-2 font-bold text-sm bg-white ${borderClass}`}
                  >
                    {contact.label} ({contact.number})
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* Popular Topics */}
        {search === '' && popularFaqs.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-3">Popular Topics</h3>
            <div className="flex flex-col gap-2">
              {popularFaqs.map(faq => (
                <button 
                  key={faq._id}
                  onClick={() => navigate(`/help/faq/${faq._id}`)}
                  className="card !p-4 flex justify-between items-center active:scale-[0.98] transition-transform"
                >
                  <span className="font-semibold text-textMain text-left">{faq.question}</span>
                  <ChevronRight size={18} className="text-muted shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Search Results */}
        {search !== '' && (
          <section>
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-3">Search Results</h3>
            <div className="flex flex-col gap-2">
              {filteredFaqs.map(faq => (
                <button 
                  key={faq._id}
                  onClick={() => navigate(`/help/faq/${faq._id}`)}
                  className="card !p-4 flex justify-between items-center"
                >
                  <span className="font-semibold text-textMain text-left">{faq.question}</span>
                  <ChevronRight size={18} className="text-muted shrink-0" />
                </button>
              ))}
              {filteredFaqs.length === 0 && (
                <p className="text-sm text-muted text-center py-4">No results found for "{search}"</p>
              )}
            </div>
          </section>
        )}

        {/* Direct Support */}
        {config && (
          <section className="card">
            <h3 className="font-bold text-lg mb-4">Need Direct Support?</h3>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0"><Phone size={20} /></div>
                <div>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Call Us</p>
                  <p className="font-bold">{config.supportPhone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Mail size={20} /></div>
                <div>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Email Us</p>
                  <p className="font-bold">{config.supportEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Clock size={20} /></div>
                <div>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Support Hours</p>
                  <p className="font-bold">{config.supportHours || 'Mon-Sun, 9AM-6PM'}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => navigate('/help/tickets/new')}
                className="w-full py-3 rounded-pill bg-primary text-white font-bold text-sm shadow-glow"
              >
                Raise a Ticket
              </button>
              <button 
                onClick={() => navigate('/help/tickets')}
                className="w-full py-3 rounded-pill pill-outline text-sm"
              >
                My Tickets
              </button>
            </div>
          </section>
        )}

        <DownloadAppSection />

      </main>
    </div>
  );
};
