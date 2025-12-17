import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

interface GestureStats {
    gesture: string;
    count: number;
    lastUsed: number;
}

interface AnalyticsData {
    totalGestures: number;
    totalClicks: number;
    totalScrolls: number;
    sessionStartTime: number;
    gestureStats: Record<string, GestureStats>;
    accuracyHistory: number[];
    hourlyUsage: number[];
}

const defaultAnalytics: AnalyticsData = {
    totalGestures: 0,
    totalClicks: 0,
    totalScrolls: 0,
    sessionStartTime: Date.now(),
    gestureStats: {},
    accuracyHistory: [],
    hourlyUsage: new Array(24).fill(0)
};

export default function AnalyticsDashboard() {
    const [analytics, setAnalytics] = useState<AnalyticsData>(() => {
        // Load from localStorage
        const saved = localStorage.getItem('gestureflow-analytics');
        return saved ? JSON.parse(saved) : defaultAnalytics;
    });

    const { currentGesture, isDetecting } = useAppStore();

    // Save analytics to localStorage
    useEffect(() => {
        localStorage.setItem('gestureflow-analytics', JSON.stringify(analytics));
    }, [analytics]);

    // Track gestures
    useEffect(() => {
        if (!currentGesture) return;

        const gesture = currentGesture.gesture;
        const hour = new Date().getHours();

        setAnalytics(prev => ({
            ...prev,
            totalGestures: prev.totalGestures + 1,
            totalClicks: gesture === 'fist' || gesture === 'pinch' ? prev.totalClicks + 1 : prev.totalClicks,
            totalScrolls: gesture.includes('point_') ? prev.totalScrolls + 1 : prev.totalScrolls,
            gestureStats: {
                ...prev.gestureStats,
                [gesture]: {
                    gesture,
                    count: (prev.gestureStats[gesture]?.count || 0) + 1,
                    lastUsed: Date.now()
                }
            },
            accuracyHistory: [...prev.accuracyHistory.slice(-99), currentGesture.confidence],
            hourlyUsage: prev.hourlyUsage.map((count, i) => i === hour ? count + 1 : count)
        }));
    }, [currentGesture]);

    const getSessionDuration = () => {
        const ms = Date.now() - analytics.sessionStartTime;
        const hours = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const getAverageAccuracy = () => {
        if (analytics.accuracyHistory.length === 0) return 0;
        return analytics.accuracyHistory.reduce((a, b) => a + b, 0) / analytics.accuracyHistory.length;
    };

    const getTopGestures = () => {
        return Object.values(analytics.gestureStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    };

    const resetAnalytics = () => {
        if (confirm('Reset all analytics data?')) {
            setAnalytics({
                ...defaultAnalytics,
                sessionStartTime: Date.now()
            });
        }
    };

    const exportAnalytics = () => {
        const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gestureflow-analytics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const maxHourlyUsage = Math.max(...analytics.hourlyUsage, 1);

    return (
        <div className="card space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">📊 Analytics</h2>
                <div className="flex gap-2">
                    <button
                        onClick={exportAnalytics}
                        className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-white/5"
                    >
                        📤 Export
                    </button>
                    <button
                        onClick={resetAnalytics}
                        className="text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded bg-white/5"
                    >
                        🗑️ Reset
                    </button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-blue-400">{analytics.totalGestures}</div>
                    <div className="text-xs text-gray-400">Total Gestures</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-green-400">{analytics.totalClicks}</div>
                    <div className="text-xs text-gray-400">Clicks</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-purple-400">{analytics.totalScrolls}</div>
                    <div className="text-xs text-gray-400">Scrolls</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-orange-400">{(getAverageAccuracy() * 100).toFixed(0)}%</div>
                    <div className="text-xs text-gray-400">Avg Accuracy</div>
                </div>
            </div>

            {/* Top Gestures */}
            <section>
                <h3 className="text-sm font-medium text-gray-400 mb-3">🏆 Most Used Gestures</h3>
                <div className="space-y-2">
                    {getTopGestures().map((stat, i) => (
                        <div key={stat.gesture} className="flex items-center gap-3">
                            <div className="w-6 text-center text-gray-500 font-medium">#{i + 1}</div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-white capitalize">
                                        {stat.gesture.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs text-gray-400">{stat.count}</span>
                                </div>
                                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
                                        style={{
                                            width: `${(stat.count / (getTopGestures()[0]?.count || 1)) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    {getTopGestures().length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                            No gesture data yet. Start using gestures!
                        </div>
                    )}
                </div>
            </section>

            {/* Hourly Usage Chart */}
            <section>
                <h3 className="text-sm font-medium text-gray-400 mb-3">📈 Usage by Hour</h3>
                <div className="flex items-end gap-1 h-24 bg-white/5 rounded-lg p-2">
                    {analytics.hourlyUsage.map((count, hour) => (
                        <div
                            key={hour}
                            className="flex-1 group relative"
                        >
                            <div
                                className="w-full bg-gradient-to-t from-primary-600 to-primary-400 rounded-t transition-all hover:from-primary-500 hover:to-primary-300"
                                style={{
                                    height: `${(count / maxHourlyUsage) * 100}%`,
                                    minHeight: count > 0 ? '4px' : '0'
                                }}
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                    {hour}:00 - {count} gestures
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-2">
                    <span>0:00</span>
                    <span>6:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:00</span>
                </div>
            </section>

            {/* Accuracy Over Time */}
            <section>
                <h3 className="text-sm font-medium text-gray-400 mb-3">🎯 Accuracy History (Last 100)</h3>
                <div className="flex items-end gap-px h-16 bg-white/5 rounded-lg p-2">
                    {analytics.accuracyHistory.slice(-50).map((acc, i) => (
                        <div
                            key={i}
                            className={`flex-1 rounded-t transition-all ${acc >= 0.9 ? 'bg-green-500' :
                                    acc >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                            style={{ height: `${acc * 100}%` }}
                        />
                    ))}
                    {analytics.accuracyHistory.length === 0 && (
                        <div className="w-full text-center text-gray-500 text-xs self-center">
                            Accuracy data will appear here
                        </div>
                    )}
                </div>
            </section>

            {/* Session Info */}
            <div className="flex items-center justify-between text-sm text-gray-400 pt-4 border-t border-gray-700">
                <span>Session Duration: {getSessionDuration()}</span>
                <span className={`flex items-center gap-2 ${isDetecting ? 'text-green-400' : 'text-gray-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                    {isDetecting ? 'Tracking Active' : 'Tracking Paused'}
                </span>
            </div>
        </div>
    );
}
