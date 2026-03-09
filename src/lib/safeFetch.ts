/**
 * Safe fetch utilities with retry limits and deduplication.
 * Prevents infinite loops and excessive API calls.
 */

// Global registry to track in-flight and completed requests
const inFlightRequests = new Map<string, Promise<Response>>();
const failedRequests = new Map<string, { count: number; lastAttempt: number }>();

// Configuration
const MAX_RETRIES = 3;
const RETRY_COOLDOWN_MS = 30000; // 30 seconds before allowing retry after max failures
const DEDUP_WINDOW_MS = 100; // Deduplicate requests within 100ms

interface SafeFetchOptions extends RequestInit {
  /** Custom key for deduplication (defaults to URL + method + body hash) */
  dedupKey?: string;
  /** Maximum number of retries before giving up (default: 3) */
  maxRetries?: number;
  /** Skip deduplication for this request */
  skipDedup?: boolean;
  /** Callback when request is blocked due to rate limiting */
  onBlocked?: (reason: string) => void;
}

interface SafeFetchResult<T> {
  data: T | null;
  error: string | null;
  blocked: boolean;
  status: number | null;
}

/**
 * Generate a dedup key from request parameters
 */
function generateDedupKey(url: string, options?: RequestInit): string {
  const method = options?.method || "GET";
  const body = options?.body ? String(options.body).slice(0, 100) : "";
  return `${method}:${url}:${body}`;
}

/**
 * Check if a request should be blocked due to too many failures
 */
function shouldBlockRequest(key: string): { blocked: boolean; reason?: string } {
  const failure = failedRequests.get(key);
  if (!failure) return { blocked: false };
  
  if (failure.count >= MAX_RETRIES) {
    const timeSinceLastAttempt = Date.now() - failure.lastAttempt;
    if (timeSinceLastAttempt < RETRY_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RETRY_COOLDOWN_MS - timeSinceLastAttempt) / 1000);
      return { 
        blocked: true, 
        reason: `Request blocked: exceeded ${MAX_RETRIES} retries. Wait ${waitSeconds}s before retrying.` 
      };
    }
    // Cooldown expired, reset counter
    failedRequests.delete(key);
  }
  
  return { blocked: false };
}

/**
 * Record a failed request
 */
function recordFailure(key: string): void {
  const existing = failedRequests.get(key);
  failedRequests.set(key, {
    count: (existing?.count || 0) + 1,
    lastAttempt: Date.now(),
  });
}

/**
 * Clear failure record on success
 */
function clearFailure(key: string): void {
  failedRequests.delete(key);
}

/**
 * Safe fetch wrapper that prevents infinite loops and excessive retries.
 * 
 * Features:
 * - Deduplicates concurrent identical requests
 * - Limits retries to prevent runaway API calls
 * - Implements cooldown after max failures
 * - Returns structured result with error info
 */
export async function safeFetch<T = unknown>(
  url: string,
  options?: SafeFetchOptions
): Promise<SafeFetchResult<T>> {
  const key = options?.dedupKey || generateDedupKey(url, options);
  // Note: maxRetries from options is used via shouldBlockRequest which uses the global MAX_RETRIES
  // Future enhancement could pass custom maxRetries to shouldBlockRequest
  
  // Check if request should be blocked
  const blockCheck = shouldBlockRequest(key);
  if (blockCheck.blocked) {
    console.warn(`[safeFetch] ${blockCheck.reason} URL: ${url}`);
    options?.onBlocked?.(blockCheck.reason!);
    return { data: null, error: blockCheck.reason!, blocked: true, status: null };
  }
  
  // Check for in-flight duplicate (unless skipping dedup)
  if (!options?.skipDedup) {
    const inFlight = inFlightRequests.get(key);
    if (inFlight) {
      console.debug(`[safeFetch] Deduplicating request: ${key}`);
      try {
        const response = await inFlight;
        const data = await response.clone().json();
        return { data, error: null, blocked: false, status: response.status };
      } catch (err) {
        return { data: null, error: String(err), blocked: false, status: null };
      }
    }
  }
  
  // Create the fetch promise
  const fetchPromise = fetch(url, options);
  
  // Register in-flight (with cleanup after short window)
  if (!options?.skipDedup) {
    inFlightRequests.set(key, fetchPromise);
    setTimeout(() => inFlightRequests.delete(key), DEDUP_WINDOW_MS);
  }
  
  try {
    const response = await fetchPromise;
    
    if (!response.ok) {
      recordFailure(key);
      const errorText = await response.text().catch(() => "Unknown error");
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        errorMessage = errorText;
      }
      return { 
        data: null, 
        error: `HTTP ${response.status}: ${errorMessage}`, 
        blocked: false, 
        status: response.status 
      };
    }
    
    // Success - clear any failure record
    clearFailure(key);
    
    const data = await response.json();
    return { data, error: null, blocked: false, status: response.status };
  } catch (err) {
    recordFailure(key);
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[safeFetch] Request failed: ${url}`, error);
    return { data: null, error, blocked: false, status: null };
  }
}

/**
 * Hook-friendly fetch tracker for React components.
 * Uses refs internally to prevent re-render loops.
 */
export class FetchTracker {
  private fetched = new Set<string>();
  private fetching = new Set<string>();
  private failures = new Map<string, number>();
  private maxRetries: number;
  
  constructor(maxRetries = MAX_RETRIES) {
    this.maxRetries = maxRetries;
  }
  
  /**
   * Check if a key can be fetched (not already fetched, not in progress, not blocked)
   */
  canFetch(key: string): boolean {
    if (this.fetched.has(key) || this.fetching.has(key)) {
      return false;
    }
    const failures = this.failures.get(key) || 0;
    if (failures >= this.maxRetries) {
      console.warn(`[FetchTracker] Key "${key}" blocked after ${failures} failures`);
      return false;
    }
    return true;
  }
  
  /**
   * Mark a key as currently being fetched
   */
  startFetch(key: string): void {
    this.fetching.add(key);
  }
  
  /**
   * Mark a fetch as completed successfully
   */
  completeFetch(key: string): void {
    this.fetching.delete(key);
    this.fetched.add(key);
    this.failures.delete(key);
  }
  
  /**
   * Mark a fetch as failed
   */
  failFetch(key: string): void {
    this.fetching.delete(key);
    const current = this.failures.get(key) || 0;
    this.failures.set(key, current + 1);
  }
  
  /**
   * Reset state for a specific key (allow refetch)
   */
  reset(key: string): void {
    this.fetched.delete(key);
    this.fetching.delete(key);
    this.failures.delete(key);
  }
  
  /**
   * Reset all state
   */
  resetAll(): void {
    this.fetched.clear();
    this.fetching.clear();
    this.failures.clear();
  }
  
  /**
   * Get current failure count for a key
   */
  getFailureCount(key: string): number {
    return this.failures.get(key) || 0;
  }
  
  /**
   * Check if a key is blocked due to too many failures
   */
  isBlocked(key: string): boolean {
    return (this.failures.get(key) || 0) >= this.maxRetries;
  }
}

/**
 * Create a fetch tracker instance (for use with useRef in components)
 */
export function createFetchTracker(maxRetries = MAX_RETRIES): FetchTracker {
  return new FetchTracker(maxRetries);
}
