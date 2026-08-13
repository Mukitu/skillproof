
import { useCallback, useEffect, useState } from 'react';
import {
  getAdminInterviewAnalytics,
  type AdminInterviewAnalytics,
} from '../services/interview';

const EMPTY: AdminInterviewAnalytics = {
  total_sessions: 0,
  completed_count: 0,
  total_unique_users: 0,
  average_score: null,
  pass_count: 0,
  fail_count: 0,
  category_breakdown: [],
  most_selected_categories: [],
  pass_fail_breakdown: { pass: 0, fail: 0 },
};

export function useAdminInterviewAnalytics() {
  const [data, setData] = useState<AdminInterviewAnalytics>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAdminInterviewAnalytics();
      setData(result);
    } catch (e) {
      console.warn('[useAdminInterviewAnalytics] refresh failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    
    
    const id = setInterval(() => {
      void refresh();
    }, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, loading, refresh };
}

export default useAdminInterviewAnalytics;
