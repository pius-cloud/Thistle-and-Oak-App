import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  Campaign,
  DailyPerformance,
  Post,
  CommentItem,
  AISentimentResult,
  AIRecommendation,
} from '../types/analytics';
import {
  parseCSV,
  mapCampaigns,
  mapDailyPerformance,
  mapPosts,
  mapComments,
} from '../utils/csvParser';
import { FilterState } from '../utils/analyticsCalculations';

const SHEET_ID = '1ewWA8qRov3EWjE1v5fTfytY67WI1AMCWx8BbhYPMqwI';

interface AnalyticsContextType {
  campaigns: Campaign[];
  dailyPerformance: DailyPerformance[];
  posts: Post[];
  comments: CommentItem[];
  campaignsMap: Map<string, Campaign>;
  loading: boolean;
  error: string | null;
  tabErrors: Record<string, string | null>;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
  // Global filters
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  availableChannels: string[];
  availableObjectives: string[];
  dateBounds: { min: string; max: string };
  // AI states
  aiSentimentResults: AISentimentResult[];
  setAiSentimentResults: React.Dispatch<React.SetStateAction<AISentimentResult[]>>;
  aiSentimentLoading: boolean;
  setAiSentimentLoading: React.Dispatch<React.SetStateAction<boolean>>;
  aiSentimentProgress: { currentBatch: number; totalBatches: number; processedCount: number; totalCount: number };
  setAiSentimentProgress: React.Dispatch<React.SetStateAction<{ currentBatch: number; totalBatches: number; processedCount: number; totalCount: number }>>;
  aiRecommendations: AIRecommendation[];
  setAiRecommendations: React.Dispatch<React.SetStateAction<AIRecommendation[]>>;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dailyPerformance, setDailyPerformance] = useState<DailyPerformance[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabErrors, setTabErrors] = useState<Record<string, string | null>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Global filters for Executive Summary
  const [filters, setFilters] = useState<FilterState>({
    channel: 'All',
    objective: 'All',
    startDate: '',
    endDate: '',
  });

  // AI states
  const [aiSentimentResults, setAiSentimentResults] = useState<AISentimentResult[]>([]);
  const [aiSentimentLoading, setAiSentimentLoading] = useState<boolean>(false);
  const [aiSentimentProgress, setAiSentimentProgress] = useState({
    currentBatch: 0,
    totalBatches: 0,
    processedCount: 0,
    totalCount: 0,
  });
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);

  const fetchTabCSV = async (tabName: string): Promise<string> => {
    // First try the backend proxy endpoint
    try {
      const response = await fetch(`/api/data/${tabName}?refresh=true`);
      if (response.ok) {
        return await response.text();
      }
    } catch {
      // Fallback below
    }

    // Direct Google Sheet fetch fallback
    const directUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
    const directRes = await fetch(directUrl);
    if (!directRes.ok) {
      throw new Error(`Failed to load "${tabName}" (HTTP ${directRes.status})`);
    }
    return await directRes.text();
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    const errors: Record<string, string | null> = {};

    let loadedCamp: Campaign[] = [];
    let loadedDaily: DailyPerformance[] = [];
    let loadedPosts: Post[] = [];
    let loadedComments: CommentItem[] = [];

    // Fetch campaigns
    try {
      const campCSV = await fetchTabCSV('campaigns');
      loadedCamp = mapCampaigns(parseCSV(campCSV));
      errors['campaigns'] = null;
    } catch (err: any) {
      errors['campaigns'] = err.message || 'Error loading campaigns tab';
    }

    // Fetch daily_performance
    try {
      const dailyCSV = await fetchTabCSV('daily_performance');
      loadedDaily = mapDailyPerformance(parseCSV(dailyCSV));
      errors['daily_performance'] = null;
    } catch (err: any) {
      errors['daily_performance'] = err.message || 'Error loading daily_performance tab';
    }

    // Fetch posts
    try {
      const postsCSV = await fetchTabCSV('posts');
      loadedPosts = mapPosts(parseCSV(postsCSV));
      errors['posts'] = null;
    } catch (err: any) {
      errors['posts'] = err.message || 'Error loading posts tab';
    }

    // Fetch comments
    try {
      const commCSV = await fetchTabCSV('comments');
      loadedComments = mapComments(parseCSV(commCSV));
      errors['comments'] = null;
    } catch (err: any) {
      errors['comments'] = err.message || 'Error loading comments tab';
    }

    setTabErrors(errors);

    const hasAnySuccess = loadedCamp.length > 0 || loadedDaily.length > 0 || loadedPosts.length > 0 || loadedComments.length > 0;
    const hasAnyError = Object.values(errors).some(e => e !== null);

    if (hasAnySuccess) {
      setCampaigns(loadedCamp);
      setDailyPerformance(loadedDaily);
      setPosts(loadedPosts);
      setComments(loadedComments);
      setLastUpdated(new Date());

      // Set initial date range from actual data
      if (loadedDaily.length > 0) {
        const dates = loadedDaily.map(d => d.date).filter(Boolean).sort();
        if (dates.length > 0) {
          setFilters(prev => ({
            ...prev,
            startDate: prev.startDate || dates[0],
            endDate: prev.endDate || dates[dates.length - 1],
          }));
        }
      }
    }

    if (!hasAnySuccess && hasAnyError) {
      setError('Unable to load Google Sheet data. Please check your network connection and click "Refresh data".');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const campaignsMap = useMemo(() => {
    const map = new Map<string, Campaign>();
    campaigns.forEach(c => map.set(c.campaign_id, c));
    return map;
  }, [campaigns]);

  const availableChannels = useMemo(() => {
    const set = new Set<string>();
    dailyPerformance.forEach(d => {
      if (d.channel) set.add(d.channel);
    });
    return Array.from(set).sort();
  }, [dailyPerformance]);

  const availableObjectives = useMemo(() => {
    const set = new Set<string>();
    campaigns.forEach(c => {
      if (c.objective) set.add(c.objective);
    });
    return Array.from(set).sort();
  }, [campaigns]);

  const dateBounds = useMemo(() => {
    if (dailyPerformance.length === 0) {
      return { min: '2026-01-01', max: '2026-09-30' };
    }
    const dates = dailyPerformance.map(d => d.date).filter(Boolean).sort();
    return {
      min: dates[0] || '2026-01-01',
      max: dates[dates.length - 1] || '2026-09-30',
    };
  }, [dailyPerformance]);

  const resetFilters = () => {
    setFilters({
      channel: 'All',
      objective: 'All',
      startDate: dateBounds.min,
      endDate: dateBounds.max,
    });
  };

  return (
    <AnalyticsContext.Provider
      value={{
        campaigns,
        dailyPerformance,
        posts,
        comments,
        campaignsMap,
        loading,
        error,
        tabErrors,
        lastUpdated,
        refreshData: loadAllData,
        filters,
        setFilters,
        resetFilters,
        availableChannels,
        availableObjectives,
        dateBounds,
        aiSentimentResults,
        setAiSentimentResults,
        aiSentimentLoading,
        setAiSentimentLoading,
        aiSentimentProgress,
        setAiSentimentProgress,
        aiRecommendations,
        setAiRecommendations,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};
