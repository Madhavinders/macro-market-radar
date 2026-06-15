import { useState, useMemo } from 'react';
import { NewsItem } from '../types';
import { Newspaper, Search, ExternalLink, Calendar, Radio } from 'lucide-react';

interface NewsFeedProps {
  news: NewsItem[];
  isLoading: boolean;
}

export function NewsFeed({ news, isLoading }: NewsFeedProps) {
  const [search, setSearch] = useState('');

  // Elapsed time format helper
  const getElapsedTime = (isoString: string) => {
    try {
      const now = new Date();
      const pub = new Date(isoString);
      const diffMs = now.getTime() - pub.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      if (isNaN(diffMinutes) || diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;

      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch (_) {
      return 'Recent';
    }
  };

  const filteredNews = useMemo(() => {
    if (!search.trim()) return news;
    const term = search.toLowerCase();
    return news.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.source.toLowerCase().includes(term)
    );
  }, [news, search]);

  return (
    <div id="financial-wire-news-panel" className="bg-brand-card border border-brand-border rounded-xl p-5 flex flex-col h-full max-h-[750px]">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-brand-green" />
            Financial Wire Feed
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-green"></span>
            </span>
            <span className="text-[10px] text-brand-text-muted font-mono uppercase tracking-widest">
              Live Macro Feed
            </span>
          </div>
        </div>

        {/* Dynamic Search */}
        <div className="relative shrink-0 w-44 sm:w-56">
          <input
            id="news-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search news wire..."
            className="w-full text-xs bg-brand-bar hover:bg-brand-hover text-brand-text placeholder-brand-text-muted rounded-lg px-3 py-1.5 pl-8 border border-brand-border focus:outline-none focus:border-brand-green/50 transition-all font-mono"
          />
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-brand-text-muted" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2 text-brand-text-muted">
          <Radio className="w-6 h-6 animate-pulse text-brand-green" />
          <span className="text-xs font-mono tracking-wider">Syncing updates from global wires...</span>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-brand-text-muted text-xs font-mono">
          <span>No matching macro articles located in wire feed.</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 scrollbar-thin">
          {filteredNews.map((item, index) => (
            <a
              id={`news-item-link-${index}`}
              key={index}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="group block bg-brand-hover/40 hover:bg-brand-hover p-3.5 rounded-xl border border-brand-border transition-all duration-300"
            >
              <div className="flex justify-between items-start gap-3">
                <h4 className="text-xs font-medium text-brand-text line-clamp-2 leading-relaxed group-hover:text-white transition-colors">
                  {item.title}
                </h4>
                <ExternalLink className="w-3 h-3 text-brand-text-muted group-hover:text-white transition-colors shrink-0 mt-0.5" />
              </div>
              
              <div className="flex items-center justify-between text-[10px] text-brand-text-muted font-mono mt-2.5">
                <span className="font-semibold text-brand-green bg-brand-green/10 px-1.5 py-0.5 rounded border border-brand-green/20">
                  {item.source}
                </span>
                <span className="flex items-center gap-1 text-brand-text-muted">
                  <Calendar className="w-3 h-3" />
                  {getElapsedTime(item.pubDate)}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
