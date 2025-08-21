import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Target, DollarSign, Users, Calendar, Music, Upload, FileText, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';
import Papa from 'papaparse';

const mockCampaignData = {
  meta_campaigns: [
    {
      id: 'meta_001',
      name: 'La Traviata Opera - Premium Audience',
      event_type: 'opera',
      client: 'Metropolitan Opera',
      spend: 2500,
      currency: 'EUR',
      impressions: 45000,
      clicks: 890,
      conversions: 23,
      conversion_rate: 2.58,
      cpc: 2.81,
      cost_per_conversion: 108.70,
      ctr: 1.98,
      audience: 'Opera Enthusiasts 45-65',
      creative_type: 'Emotional Story',
      platform: 'meta',
      days_running: 7,
      data_quality_flags: [],
      daily_performance: [
        { date: '2025-08-06', impressions: 6400, clicks: 127, conversions: 3, cost: 357 },
        { date: '2025-08-07', impressions: 6430, clicks: 132, conversions: 4, cost: 371 }
      ]
    }
  ],
  google_campaigns: [
    {
      id: 'google_001',
      name: 'Opera Tickets - Brand Keywords',
      event_type: 'opera',
      client: 'Metropolitan Opera',
      spend: 1500,
      currency: 'EUR',
      impressions: 25000,
      clicks: 625,
      conversions: 31,
      conversion_rate: 4.96,
      cpc: 2.40,
      cost_per_conversion: 48.39,
      ctr: 2.50,
      platform: 'google',
      days_running: 7,
      data_quality_flags: [],
      daily_performance: [
        { date: '2025-08-06', impressions: 3570, clicks: 89, conversions: 4, cost: 214 },
        { date: '2025-08-07', impressions: 3650, clicks: 91, conversions: 5, cost: 218 }
      ]
    }
  ],
  historical_performance: {
    evergreen_concepts: [
      {
        concept: 'Emotional Story + Opera Enthusiasts 45-65',
        avg_conversion_rate: 3.2,
        success_rate: 0.85,
        best_events: ['opera']
      }
    ]
  }
};

const AdOptimizationAgent = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [insights, setInsights] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadedData, setUploadedData] = useState(null);
  const [dataSource, setDataSource] = useState('sample');

  const parseUploadedReport = (csvText, reportType) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    let headerLineIndex = lines.findIndex(line => line.includes('Campaign'));
    if (headerLineIndex === -1) headerLineIndex = 0;
    
    const csvData = lines.slice(headerLineIndex).join('\n');
    const parsedData = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true
    });

    if (reportType === 'google') {
      return parseGoogleReport(parsedData.data);
    } else if (reportType === 'meta') {
      return parseMetaReport(parsedData.data);
    }
    
    return [];
  };

  const parseGoogleReport = (data) => {
    // Aggregate daily data by campaign
    const campaignStats = {};
    
    data.forEach(row => {
      const campaign = row.Campaign;
      if (!campaign) return;
      
      if (!campaignStats[campaign]) {
        campaignStats[campaign] = {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          cost: 0,
          currency: row['Converted currency code'] || 'EUR',
          days: new Set(),
          dailyData: []
        };
      }
      
      // Parse numbers properly
      const impressions = parseInt(row['Impr.'] || row.Impressions || 0);
      const clicks = parseInt(row.Clicks || 0);
      const conversions = parseFloat(row.Conversions || 0);
      const cost = parseFloat(row['Cost (Converted currency)'] || row.Cost || 0);
      
      campaignStats[campaign].impressions += impressions;
      campaignStats[campaign].clicks += clicks;
      campaignStats[campaign].conversions += conversions;
      campaignStats[campaign].cost += cost;
      campaignStats[campaign].days.add(row.Day);
      campaignStats[campaign].dailyData.push({
        date: row.Day,
        impressions,
        clicks,
        conversions,
        cost
      });
    });

    return convertCampaignStats(campaignStats, 'google');
  };

  const parseMetaReport = (data) => {
    // Aggregate daily data by campaign for Meta format
    const campaignStats = {};
    
    data.forEach(row => {
      const campaign = row['Campaign name'];
      if (!campaign) return;
      
      if (!campaignStats[campaign]) {
        campaignStats[campaign] = {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          cost: 0,
          currency: row.Currency || 'EUR',
          days: new Set(),
          dailyData: []
        };
      }
      
      // Parse numbers properly for Meta format using exact field mappings
      const impressions = parseInt(row.Impressions || 0);
      const clicks = parseInt(row['Link clicks'] || 0);
      const conversions = parseFloat(row.Purchases || 0);
      const cost = parseFloat(row['Amount spent (EUR)'] || 0);
      const date = row.Day;
      
      campaignStats[campaign].impressions += impressions;
      campaignStats[campaign].clicks += clicks;
      campaignStats[campaign].conversions += conversions;
      campaignStats[campaign].cost += cost;
      if (date) campaignStats[campaign].days.add(date);
      campaignStats[campaign].dailyData.push({
        date: date,
        impressions,
        clicks,
        conversions,
        cost
      });
    });

    return convertCampaignStats(campaignStats, 'meta');
  };

  const convertCampaignStats = (campaignStats, platform) => {
    return Object.keys(campaignStats).map(campaignName => {
      const stats = campaignStats[campaignName];
      const daysRunning = stats.days.size;
      
      // Calculate metrics properly
      const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
      const conversionRate = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0;
      const cpc = stats.clicks > 0 ? stats.cost / stats.clicks : 0;
      const costPerConversion = stats.conversions > 0 ? stats.cost / stats.conversions : 0;

      return {
        id: `${platform}_${campaignName.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: campaignName,
        spend: stats.cost,
        currency: stats.currency,
        impressions: stats.impressions,
        clicks: stats.clicks,
        conversions: stats.conversions,
        conversion_rate: conversionRate,
        cpc: cpc,
        cost_per_conversion: costPerConversion,
        ctr: ctr,
        platform: platform,
        event_type: inferEventType(campaignName),
        days_running: daysRunning,
        data_quality_flags: [],
        daily_performance: stats.dailyData
      };
    }).filter(campaign => campaign.impressions > 0);
  };

  const inferEventType = (campaignName) => {
    const name = campaignName.toLowerCase();
    if (name.includes('opera') || name.includes('traviata') || name.includes('tosca')) return 'opera';
    if (name.includes('festival') || name.includes('coachella') || name.includes('lollapalooza')) return 'festival';
    if (name.includes('concert') || name.includes('symphony') || name.includes('philharmonic')) return 'concert';
    return 'general';
  };

  const analyzePerformance = (data) => {
    const allCampaigns = [...data.meta_campaigns, ...data.google_campaigns];
    
    const totalSpend = allCampaigns.reduce((sum, camp) => sum + (camp.spend || 0), 0);
    const totalConversions = allCampaigns.reduce((sum, camp) => sum + (camp.conversions || 0), 0);
    const avgConversionRate = allCampaigns.length > 0 ? 
      allCampaigns.reduce((sum, camp) => sum + (camp.conversion_rate || 0), 0) / allCampaigns.length : 0;

    return {
      totalSpend,
      totalConversions,
      avgConversionRate,
      avgCostPerConversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
      hasSpendData: totalSpend > 0,
      currency: 'EUR',
      topPerformers: allCampaigns.filter(c => c.conversions > 0),
      underPerformers: allCampaigns.filter(c => c.conversions === 0),
      dataQualityIssues: allCampaigns.filter(c => c.data_quality_flags?.length > 0)
    };
  };

  const generateRecommendations = (data, insights) => {
    const recommendations = [];
    const allCampaigns = [...data.meta_campaigns, ...data.google_campaigns];
    
    if (allCampaigns.length === 0) return recommendations;
    
    // Group all daily performance data by week, then by platform, then by campaign
    const weeklyData = {};
    
    allCampaigns.forEach(campaign => {
      if (campaign.daily_performance) {
        campaign.daily_performance.forEach(day => {
          const date = new Date(day.date);
          const startOfYear = new Date(date.getFullYear(), 0, 1);
          const weekNumber = Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
          const weekKey = `${date.getFullYear()}-W${weekNumber}`;
          
          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
              weekNumber,
              year: date.getFullYear(),
              platforms: {}
            };
          }
          
          const platform = campaign.platform === 'google' ? 'Google' : 'Meta';
          if (!weeklyData[weekKey].platforms[platform]) {
            weeklyData[weekKey].platforms[platform] = {};
          }
          
          if (!weeklyData[weekKey].platforms[platform][campaign.name]) {
            weeklyData[weekKey].platforms[platform][campaign.name] = {
              eventType: campaign.event_type || 'general',
              spend: 0,
              conversions: 0,
              clicks: 0,
              impressions: 0,
              days: 0
            };
          }
          
          weeklyData[weekKey].platforms[platform][campaign.name].spend += day.cost || 0;
          weeklyData[weekKey].platforms[platform][campaign.name].conversions += day.conversions || 0;
          weeklyData[weekKey].platforms[platform][campaign.name].clicks += day.clicks || 0;
          weeklyData[weekKey].platforms[platform][campaign.name].impressions += day.impressions || 0;
          weeklyData[weekKey].platforms[platform][campaign.name].days += 1;
        });
      }
    });
    
    // Generate at least one recommendation per week, per platform, per campaign
    Object.entries(weeklyData)
      .sort(([a], [b]) => b.localeCompare(a)) // Sort by week descending (most recent first)
      .forEach(([weekKey, weekData]) => {
        
        Object.entries(weekData.platforms).forEach(([platform, campaigns]) => {
          
          Object.entries(campaigns).forEach(([campaignName, campaignData]) => {
            const conversionRate = campaignData.clicks > 0 ? 
              (campaignData.conversions / campaignData.clicks) * 100 : 0;
            const costPerConversion = campaignData.conversions > 0 ? 
              campaignData.spend / campaignData.conversions : 0;
            
            let priority, type, action, reasoning, impact, icon, color;
            
            // Determine recommendation type based on performance
            if (campaignData.conversions > 0 && conversionRate > 2) {
              // High performer
              priority = 'HIGH';
              type = 'SCALE';
              action = `Scale ${campaignName}`;
              reasoning = `This campaign is delivering strong results with ${campaignData.conversions} conversions at a ${conversionRate.toFixed(2)}% conversion rate`;
              impact = 'Increase budget allocation';
              icon = TrendingUp;
              color = 'text-green-600';
            } else if (campaignData.clicks > 5 && campaignData.conversions === 0) {
              // Poor converter
              priority = 'MEDIUM';
              type = 'OPTIMIZE';
              action = `Fix ${campaignName}`;
              reasoning = `Campaign is generating clicks but failing to convert, wasting €${campaignData.spend.toFixed(2)} with ${campaignData.clicks} clicks and zero conversions`;
              impact = 'Review targeting & landing pages';
              icon = TrendingDown;
              color = 'text-red-600';
            } else if (campaignData.impressions > 100 && campaignData.clicks < 5) {
              // Low engagement
              priority = 'MEDIUM';
              type = 'IMPROVE';
              action = `Improve ${campaignName}`;
              reasoning = `Campaign has good visibility with ${campaignData.impressions} impressions but poor engagement at ${(campaignData.clicks/campaignData.impressions*100).toFixed(2)}% CTR`;
              impact = 'Improve ad copy & targeting';
              icon = Target;
              color = 'text-orange-600';
            } else if (campaignData.spend > 0) {
              // Baseline performer
              priority = 'LOW';
              type = 'MONITOR';
              action = `Monitor ${campaignName}`;
              reasoning = `Campaign is performing at baseline levels with steady spend and moderate activity across ${campaignData.days} days`;
              impact = 'Continue current approach';
              icon = Calendar;
              color = 'text-blue-600';
            } else {
              // No activity
              priority = 'LOW';
              type = 'ACTIVATE';
              action = `Activate ${campaignName}`;
              reasoning = `Campaign shows no activity or spend during the week, indicating it may be paused or misconfigured`;
              impact = 'Consider reactivating or pausing';
              icon = AlertTriangle;
              color = 'text-gray-600';
            }
            
            recommendations.push({
              priority,
              type,
              campaign: campaignName,
              platform,
              weekNumber: weekData.weekNumber,
              action,
              reasoning,
              impact,
              icon,
              color
            });
          });
        });
      });
    
    return recommendations.slice(0, 20); // Limit to 20 to avoid overwhelming
  };

  const generateDailyPerformanceData = (data) => {
    const dailyDataMap = {};
    const allCampaigns = [...data.meta_campaigns, ...data.google_campaigns];
    
    allCampaigns.forEach(campaign => {
      if (campaign.daily_performance) {
        campaign.daily_performance.forEach(day => {
          if (!dailyDataMap[day.date]) {
            dailyDataMap[day.date] = {
              date: day.date,
              totalSpend: 0,
              totalConversions: 0,
              totalClicks: 0,
              totalImpressions: 0
            };
          }
          dailyDataMap[day.date].totalSpend += day.cost || 0;
          dailyDataMap[day.date].totalConversions += day.conversions || 0;
          dailyDataMap[day.date].totalClicks += day.clicks || 0;
          dailyDataMap[day.date].totalImpressions += day.impressions || 0;
        });
      }
    });
    
    return Object.values(dailyDataMap)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(day => ({
        ...day,
        formattedDate: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        conversionRate: day.totalClicks > 0 ? ((day.totalConversions / day.totalClicks) * 100) : 0,
        costPerConversion: day.totalConversions > 0 ? (day.totalSpend / day.totalConversions) : 0,
        ctr: day.totalImpressions > 0 ? ((day.totalClicks / day.totalImpressions) * 100) : 0,
        avgCPC: day.totalClicks > 0 ? (day.totalSpend / day.totalClicks) : 0
      }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const inputElement = event.target;
    let reportType = 'unknown';
    
    // Determine report type from input ID
    if (inputElement.id === 'meta-upload') {
      reportType = 'meta';
    } else if (inputElement.id === 'google-upload') {
      reportType = 'google';
    }

    setLoading(true);
    try {
      const text = await file.text();
      const parsedCampaigns = parseUploadedReport(text, reportType);
      
      const currentData = uploadedData || { meta_campaigns: [], google_campaigns: [], historical_performance: mockCampaignData.historical_performance };
      
      const newData = {
        meta_campaigns: reportType === 'meta' ? parsedCampaigns : currentData.meta_campaigns,
        google_campaigns: reportType === 'google' ? parsedCampaigns : currentData.google_campaigns,
        historical_performance: mockCampaignData.historical_performance
      };
      
      setUploadedData(newData);
      setDataSource('uploaded');
      
      setTimeout(() => {
        const analysisResults = analyzePerformance(newData);
        const dailyRecommendations = generateRecommendations(newData, analysisResults);
        const dailyChartData = generateDailyPerformanceData(newData);
        
        setInsights({...analysisResults, dailyPerformance: dailyChartData});
        setRecommendations(dailyRecommendations);
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const runAnalysis = () => {
    setLoading(true);
    const dataToAnalyze = dataSource === 'uploaded' ? uploadedData : mockCampaignData;
    
    setTimeout(() => {
      const analysisResults = analyzePerformance(dataToAnalyze);
      const dailyRecommendations = generateRecommendations(dataToAnalyze, analysisResults);
      const dailyChartData = generateDailyPerformanceData(dataToAnalyze);
      
      setInsights({...analysisResults, dailyPerformance: dailyChartData});
      setRecommendations(dailyRecommendations);
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-700 border border-red-200';
      case 'MEDIUM': return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'LOW': return 'bg-green-100 text-green-700 border border-green-200';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Music className="text-purple-600" />
              AI Agent - Performing Arts Ad Optimizer
            </h1>
            <p className="text-gray-600 mt-2">Daily campaign analysis and optimization recommendations</p>
          </div>
          <button 
            onClick={runAnalysis}
            disabled={loading}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Analyzing...' : 'Run Analysis'}
            <TrendingUp size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Upload className="text-blue-500" />
            Data Source
          </h2>
          <p className="text-gray-600 mt-1">Upload exported reports from Google Ads</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
              <FileText className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Meta Ads Report</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Upload CSV from Meta Ads Manager with columns:
                <br />
                <code className="text-xs bg-gray-100 px-1 rounded">Account name,Campaign name,Day,Impressions,Frequency,Currency,Amount spent (EUR),Purchases,Purchases conversion value,Link clicks,Reporting starts,Reporting ends</code>
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="meta-upload"
              />
              <label 
                htmlFor="meta-upload" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer inline-flex items-center gap-2"
              >
                <Upload size={16} />
                Choose Meta File
              </label>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
              <FileText className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Google Ads Report</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Upload CSV with format: Campaign,Day,Converted currency code,Cost(Converted currency),Impr.,Clicks,Conversions
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="google-upload"
              />
              <label 
                htmlFor="google-upload" 
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 cursor-pointer inline-flex items-center gap-2"
              >
                <Upload size={16} />
                Choose Google File
              </label>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${dataSource === 'uploaded' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm text-gray-600">
                {dataSource === 'uploaded' ? 
                  `Using uploaded data (${uploadedData?.meta_campaigns?.length || 0} Meta, ${uploadedData?.google_campaigns?.length || 0} Google campaigns)` : 
                  'Using sample data'
                }
              </span>
            </div>
            {dataSource === 'uploaded' && (
              <button 
                onClick={() => {
                  setDataSource('sample');
                  setUploadedData(null);
                  runAnalysis();
                }}
                className="text-purple-600 hover:text-purple-700 text-sm"
              >
                Switch to sample data
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing campaign data and generating recommendations...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Spend</p>
                  <p className="text-2xl font-bold text-gray-900">
                    €{insights.totalSpend?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <DollarSign className="text-green-600" size={24} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Conversions</p>
                  <p className="text-2xl font-bold text-gray-900">{insights.totalConversions || 0}</p>
                </div>
                <Target className="text-blue-600" size={24} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Conversion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{insights.avgConversionRate?.toFixed(2) || '0.00'}%</p>
                </div>
                <TrendingUp className="text-purple-600" size={24} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Cost/Conversion</p>
                  <p className="text-2xl font-bold text-gray-900">
                    €{insights.avgCostPerConversion?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <DollarSign className="text-orange-600" size={24} />
              </div>
            </div>
          </div>

          {insights.dailyPerformance && insights.dailyPerformance.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border mb-8">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="text-blue-500" />
                  Daily Performance - Last {insights.dailyPerformance.length} Days
                </h2>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Spend (€) & Cost per Conversion</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart data={insights.dailyPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="formattedDate" fontSize={12} />
                        <YAxis yAxisId="left" fontSize={12} />
                        <YAxis yAxisId="right" orientation="right" fontSize={12} />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'Daily Spend') return [`€${value.toFixed(2)}`, 'Spend'];
                            if (name === 'Cost per Conversion') return [`€${value.toFixed(2)}`, 'Cost/Conv'];
                            return [value, name];
                          }}
                        />
                        <Bar yAxisId="left" dataKey="totalSpend" fill="#10b981" name="Daily Spend" />
                        <Line 
                          yAxisId="right" 
                          type="monotone" 
                          dataKey="costPerConversion" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                          name="Cost per Conversion"
                          connectNulls={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Conversions & Conversion Rate</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart data={insights.dailyPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="formattedDate" fontSize={12} />
                        <YAxis yAxisId="left" fontSize={12} />
                        <YAxis yAxisId="right" orientation="right" fontSize={12} />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'Daily Conversions') return [value, 'Conversions'];
                            if (name === 'Conversion Rate') return [`${value.toFixed(2)}%`, 'Conv Rate'];
                            return [value, name];
                          }}
                        />
                        <Bar yAxisId="left" dataKey="totalConversions" fill="#3b82f6" name="Daily Conversions" />
                        <Line 
                          yAxisId="right" 
                          type="monotone" 
                          dataKey="conversionRate" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                          name="Conversion Rate"
                          connectNulls={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Impressions & CTR</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart data={insights.dailyPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="formattedDate" fontSize={12} />
                        <YAxis yAxisId="left" fontSize={12} />
                        <YAxis yAxisId="right" orientation="right" fontSize={12} />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'Daily Impressions') return [value.toLocaleString(), 'Impressions'];
                            if (name === 'CTR') return [`${value.toFixed(2)}%`, 'CTR'];
                            return [value, name];
                          }}
                        />
                        <Bar yAxisId="left" dataKey="totalImpressions" fill="#06b6d4" name="Daily Impressions" />
                        <Line 
                          yAxisId="right" 
                          type="monotone" 
                          dataKey="ctr" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                          name="CTR"
                          connectNulls={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Clicks & CPC</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart data={insights.dailyPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="formattedDate" fontSize={12} />
                        <YAxis yAxisId="left" fontSize={12} />
                        <YAxis yAxisId="right" orientation="right" fontSize={12} />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'Daily Clicks') return [value, 'Clicks'];
                            if (name === 'CPC') return [`€${value.toFixed(2)}`, 'CPC'];
                            return [value, name];
                          }}
                        />
                        <Bar yAxisId="left" dataKey="totalClicks" fill="#f97316" name="Daily Clicks" />
                        <Line 
                          yAxisId="right" 
                          type="monotone" 
                          dataKey="avgCPC" 
                          stroke="#84cc16" 
                          strokeWidth={2}
                          dot={{ fill: '#84cc16', strokeWidth: 2, r: 3 }}
                          name="CPC"
                          connectNulls={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="text-orange-500" />
                Weekly Campaign Performance Insights
              </h2>
              <p className="text-gray-600 mt-1">Campaign-level analysis and optimization opportunities by platform and week</p>
            </div>
            
            <div className="divide-y">
              {recommendations.length > 0 ? recommendations.map((rec, index) => {
                const IconComponent = rec.icon;
                return (
                  <div key={index} className="p-6">
                    <div className="flex items-start gap-4">
                      <IconComponent className={rec.color} size={24} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                            {rec.priority} PRIORITY
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            {rec.platform}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                            Week {rec.weekNumber || 'N/A'}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">{rec.action}</h3>
                        <p className="text-gray-600 text-sm mb-2">{rec.reasoning}</p>
                        <p className="text-purple-600 text-sm font-medium mt-2">Expected: {rec.impact}</p>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-6 text-center text-gray-500">
                  No recommendations available. Upload data or run analysis.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdOptimizationAgent;
