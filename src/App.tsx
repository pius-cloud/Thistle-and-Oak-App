import React, { useState } from 'react';
import { AnalyticsProvider, useAnalytics } from './context/AnalyticsContext';
import { Header } from './components/common/Header';
import { Sidebar, PageId } from './components/common/Sidebar';
import { Footer } from './components/common/Footer';
import { ExecutiveSummaryPage } from './pages/ExecutiveSummaryPage';
import { RoiPage } from './pages/RoiPage';
import { ContentPerformancePage } from './pages/ContentPerformancePage';
import { SentimentPage } from './pages/SentimentPage';
import { AiRecommendationsPage } from './pages/AiRecommendationsPage';
import { AskDataPage } from './pages/AskDataPage';
import { AlertCircle, RefreshCw, Layers } from 'lucide-react';

function AnalyticsApp() {
  const [currentPage, setCurrentPage] = useState<PageId>('executive-summary');
  const { loading, error, tabErrors, refreshData } = useAnalytics();

  const getPageTitle = (page: PageId) => {
    switch (page) {
      case 'executive-summary':
        return 'Executive Summary';
      case 'channel-campaign-roi':
        return 'Channel & Campaign ROI';
      case 'content-performance':
        return 'Content Performance';
      case 'sentiment':
        return 'Sentiment Analysis';
      case 'ai-recommendations':
        return 'AI Recommendations';
      case 'ask-data':
        return 'Ask the Data';
      default:
        return 'Analytics Hub';
    }
  };

  const failedTabs = Object.entries(tabErrors).filter(([_, err]) => err !== null);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#1E293B]">
      {/* Top Header */}
      <Header currentPageTitle={getPageTitle(currentPage)} />

      {/* Main Layout Area: Sidebar + Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dark Sidebar */}
        <Sidebar currentPage={currentPage} onSelectPage={setCurrentPage} />

        {/* Scrollable Main Content Canvas */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col">
          {/* Tab Failure Warnings (if any single tab failed) */}
          {failedTabs.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Partial Data Ingestion Alert:</span>
                  <p className="mt-0.5 text-amber-800">
                    The following tab(s) could not be retrieved from Google Sheets:{' '}
                    <span className="font-mono font-semibold">
                      {failedTabs.map(([tab]) => tab).join(', ')}
                    </span>
                    . Remaining tabs continue to calculate accurately.
                  </p>
                </div>
              </div>
              <button
                onClick={() => refreshData()}
                className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-semibold rounded text-[11px] shrink-0"
              >
                Retry Tab Load
              </button>
            </div>
          )}

          {/* Full Error State */}
          {error ? (
            <div className="my-auto mx-auto max-w-lg text-center p-8 bg-white border border-red-200 rounded-2xl shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Failed to Connect to Google Sheets</h2>
              <p className="text-xs text-slate-600 mt-2 mb-5 leading-relaxed">{error}</p>
              <button
                onClick={() => refreshData()}
                className="px-4 py-2 bg-[#6B35A8] hover:bg-[#7D3FC5] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : loading && !failedTabs.length ? (
            /* Initial Loading State */
            <div className="my-auto mx-auto text-center p-12">
              <div className="w-10 h-10 rounded-xl bg-[#6B35A8] text-white flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-slate-800">
                Loading Thistle &amp; Oak Marketing Data
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Parsing campaigns, daily performance, posts, and UK customer sentiment from Google Sheets...
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#6B35A8] font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synchronizing live sheet...</span>
              </div>
            </div>
          ) : (
            /* Active Page Router */
            <div className="max-w-7xl w-full mx-auto pb-10">
              {currentPage === 'executive-summary' && <ExecutiveSummaryPage />}
              {currentPage === 'channel-campaign-roi' && <RoiPage />}
              {currentPage === 'content-performance' && <ContentPerformancePage />}
              {currentPage === 'sentiment' && <SentimentPage />}
              {currentPage === 'ai-recommendations' && <AiRecommendationsPage />}
              {currentPage === 'ask-data' && <AskDataPage />}
            </div>
          )}

          {/* Mandated Footer */}
          <Footer />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AnalyticsProvider>
      <AnalyticsApp />
    </AnalyticsProvider>
  );
}
