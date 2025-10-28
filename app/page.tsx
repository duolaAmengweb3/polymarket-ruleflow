'use client';

import { useState } from 'react';
import { FiSearch, FiAlertCircle, FiCheckCircle, FiExternalLink, FiLoader, FiGithub } from 'react-icons/fi';
import { AiOutlineBarChart } from 'react-icons/ai';
import { FaTelegram, FaTwitter } from 'react-icons/fa';
import Image from 'next/image';
import MermaidChart from '@/components/MermaidChart';
import { parseMarketRules } from '@/utils/ruleParser';
import { parseAdvancedMarketRules } from '@/utils/advancedRuleParser';
import { parseRulesWithGemini, GeminiQuotaError } from '@/utils/geminiRuleParser';
import { assessMarketRisk, getRiskLevelDisplay, type RiskAssessment } from '@/utils/riskAssessment';
import type { PolymarketMarket } from './api/market/route';

export default function Home() {
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<PolymarketMarket | null>(null);
  const [parsedRule, setParsedRule] = useState<any | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);

  // Translations
  const t = {
    en: {
      title: 'RuleFlow',
      subtitle: 'Polymarket Rule Visualizer',
      heroTitle: 'Visualize Market Rules in Seconds',
      heroDesc: 'Just paste any Polymarket market link to see the resolution logic as a flowchart',
      exampleText: 'Example',
      placeholder: 'Paste Polymarket link here... (e.g., https://polymarket.com/event/...)',
      visualizeBtn: 'Visualize Rules',
      tryExample: 'Try Example',
      analyzing: 'Analyzing...',
      aiAnalyzing: 'AI Analyzing...',
      aiEnhanced: 'AI Enhanced',
      fastMode: 'Fast Mode',
      aiDesc: 'Using Gemini 2.5 Flash for deep analysis',
      fastDesc: 'Using pattern matching',
      quotaError: '🤖 Gemini API quota exhausted',
      quotaTip: 'Automatically switched to standard parsing mode. Results displayed, but may be less detailed than AI analysis.',
      marketNotFound: 'Market Not Found',
      notFoundTip: 'This market may be closed, archived, or not available in the API. Try a different active market or click "Try Example" to see a working demo.',
      analyzed: 'Analyzed',
      summary: 'Summary',
      marketOptions: 'Market Options',
      total: 'total',
      detectedPatterns: 'Detected patterns',
      resolutionFlowchart: 'Resolution Flowchart',
      originalRules: 'Original Rules',
      show: 'Show',
      hide: 'Hide',
      description: 'Description',
      resolutionSource: 'Resolution Source',
      endDate: 'End Date',
      noDescription: 'No description provided',
      howItWorks: 'How It Works',
      step1Title: 'Paste Link',
      step1Desc: 'Copy any Polymarket market URL from your browser and paste it here',
      step2Title: 'Auto-Parse Rules',
      step2Desc: 'Our engine extracts conditions and logic patterns',
      step3Title: 'View Flowchart',
      step3Desc: 'See the resolution logic as a clear visual diagram',
      footerText1: 'RuleFlow is an open-source tool for visualizing Polymarket rules.',
      footerText2: 'Not affiliated with Polymarket. All data is fetched from public APIs.',
      footerTech: 'Built with Next.js, Mermaid.js, and TailwindCSS | Deployed on Vercel',
      riskScore: 'Rule Clarity Score',
      risks: 'Risk Factors',
      warnings: 'Warnings',
      strengths: 'Strengths',
    },
    zh: {
      title: 'RuleFlow',
      subtitle: 'Polymarket 规则可视化工具',
      heroTitle: '秒级可视化市场规则',
      heroDesc: '只需粘贴任意 Polymarket 市场链接，即可查看决策逻辑流程图',
      exampleText: '示例',
      placeholder: '在此粘贴 Polymarket 链接... (例如: https://polymarket.com/event/...)',
      visualizeBtn: '可视化规则',
      tryExample: '试试示例',
      analyzing: '分析中...',
      aiAnalyzing: 'AI 分析中...',
      aiEnhanced: 'AI 增强',
      fastMode: '快速模式',
      aiDesc: '使用 Gemini 2.5 Flash 深度分析',
      fastDesc: '使用模式匹配',
      quotaError: '🤖 Gemini API 额度已用完',
      quotaTip: '已自动切换到标准解析模式。结果已显示，但可能不如AI分析详细。',
      marketNotFound: '未找到市场',
      notFoundTip: '该市场可能已关闭、归档或在API中不可用。请尝试其他活跃市场或点击"试试示例"查看演示。',
      analyzed: '已分析',
      summary: '摘要',
      marketOptions: '市场选项',
      total: '共',
      detectedPatterns: '检测到的模式',
      resolutionFlowchart: '决策流程图',
      originalRules: '原始规则',
      show: '显示',
      hide: '隐藏',
      description: '描述',
      resolutionSource: '决策来源',
      endDate: '结束日期',
      noDescription: '无描述',
      howItWorks: '如何使用',
      step1Title: '粘贴链接',
      step1Desc: '从浏览器复制任意 Polymarket 市场 URL 并粘贴到这里',
      step2Title: '自动解析规则',
      step2Desc: '我们的引擎提取条件和逻辑模式',
      step3Title: '查看流程图',
      step3Desc: '以清晰的可视化图表查看决策逻辑',
      footerText1: 'RuleFlow 是一个用于可视化 Polymarket 规则的开源工具。',
      footerText2: '与 Polymarket 无关联。所有数据来自公开 API。',
      footerTech: '使用 Next.js、Mermaid.js 和 TailwindCSS 构建 | 部署在 Vercel',
      riskScore: '规则清晰度评分',
      risks: '风险因素',
      warnings: '注意事项',
      strengths: '优势',
    }
  };

  const extractSlug = (input: string): string => {
    // 清理输入
    const trimmed = input.trim();

    // 支持多种 Polymarket URL 格式
    // 格式 1: https://polymarket.com/event/fed-rate-hike-in-2025
    // 格式 2: polymarket.com/event/fed-rate-hike-in-2025
    // 格式 3: https://polymarket.com/market/fed-rate-hike-in-2025
    // 格式 4: 直接输入 slug: fed-rate-hike-in-2025

    // 尝试匹配 /event/ 格式
    let match = trimmed.match(/polymarket\.com\/event\/([^/?#]+)/i);
    if (match) return match[1];

    // 尝试匹配 /market/ 格式
    match = trimmed.match(/polymarket\.com\/market\/([^/?#]+)/i);
    if (match) return match[1];

    // 尝试匹配任何 polymarket.com/ 后的路径
    match = trimmed.match(/polymarket\.com\/([^/?#]+)/i);
    if (match && match[1] !== 'event' && match[1] !== 'market') {
      return match[1];
    }

    // 如果只是 /event/xxx 或 /market/xxx 格式
    match = trimmed.match(/^\/(?:event|market)\/([^/?#]+)/i);
    if (match) return match[1];

    // 直接返回输入（假设是 slug）
    return trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return;

    setLoading(true);
    setError(null);
    setMarketData(null);
    setParsedRule(null);
    setAiError(null);
    setRiskAssessment(null);

    try {
      const marketSlug = extractSlug(slug);
      const response = await fetch(`/api/market?slug=${encodeURIComponent(marketSlug)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch market data');
      }

      setMarketData(data);

      // Perform risk assessment
      const risk = assessMarketRisk(
        data.question,
        data.description,
        data.resolutionSource,
        data.markets
      );
      setRiskAssessment(risk);

      // Try AI parser first if enabled
      if (useAI) {
        try {
          const aiParsed = await parseRulesWithGemini(
            data.question,
            data.description,
            data.resolutionSource,
            data.markets
          );
          setParsedRule(aiParsed);
          return; // Success with AI
        } catch (aiErr: any) {
          if (aiErr instanceof GeminiQuotaError) {
            // Quota exceeded - show specific error and fallback
            setAiError(aiErr.message);
          } else {
            // Other AI error - just fallback silently
            console.error('AI parsing failed, using fallback:', aiErr.message);
          }
          // Continue to fallback parser
        }
      }

      // Fallback: Use rule-based parser
      const useAdvancedParser =
        data.description.length > 500 ||
        (data.isEvent && data.markets && data.markets.length > 2) ||
        data.description.match(/basis points?|bps|meeting|statement|unless|versus|rounded/i);

      const parsed = useAdvancedParser
        ? parseAdvancedMarketRules(
            data.question,
            data.description,
            data.resolutionSource,
            data.markets
          )
        : parseMarketRules(
            data.question,
            data.description,
            data.resolutionSource
          );
      setParsedRule(parsed);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching the market');
    } finally {
      setLoading(false);
    }
  };

  const handleExample = () => {
    setSlug('fed-rate-hike-in-2025');
    // Auto-submit after a short delay
    setTimeout(() => {
      const form = document.querySelector('form');
      form?.requestSubmit();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center justify-between gap-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white">
                <Image
                  src="/logo.png"
                  alt="RuleFlow Logo"
                  fill
                  sizes="(max-width: 768px) 40px, 48px"
                  className="object-contain p-1"
                  priority
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {t[language].title}
                </h1>
                <p className="text-xs md:text-sm text-gray-600">{t[language].subtitle}</p>
              </div>
            </div>

            {/* Right Side: Language + Social Icons */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Language Toggle */}
              <button
                onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
                className="px-2 md:px-3 py-1.5 md:py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs md:text-sm font-medium text-gray-700 transition-all"
              >
                {language === 'en' ? '中文' : 'EN'}
              </button>

              {/* Social Icons */}
              <div className="flex items-center gap-1 md:gap-2">
                <a
                  href="https://t.me/dsa885"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 md:p-2 text-gray-600 hover:text-blue-500 transition-colors"
                  aria-label="Telegram"
                >
                  <FaTelegram className="w-4 h-4 md:w-5 md:h-5" />
                </a>
                <a
                  href="https://x.com/hunterweb303"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 md:p-2 text-gray-600 hover:text-blue-400 transition-colors"
                  aria-label="Twitter"
                >
                  <FaTwitter className="w-4 h-4 md:w-5 md:h-5" />
                </a>
                <a
                  href="https://github.com/yourusername/ruleflow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 md:p-2 text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="GitHub"
                >
                  <FiGithub className="w-4 h-4 md:w-5 md:h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Search Section */}
        <div className="mb-8 md:mb-12">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
              {t[language].heroTitle}
            </h2>
            <p className="text-sm md:text-base text-gray-600 mb-2 px-4">
              {t[language].heroDesc}
            </p>
            <p className="text-xs md:text-sm text-gray-500 px-4">
              {t[language].exampleText}: https://polymarket.com/event/fed-rate-hike-in-2025
            </p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="relative">
              <FiSearch className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={t[language].placeholder}
                className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-3 md:py-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm md:text-lg transition-all text-gray-900 bg-white placeholder:text-gray-400"
                disabled={loading}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                type="submit"
                disabled={loading || !slug.trim()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-4 md:px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl text-sm md:text-base"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <FiLoader className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                    {useAI ? t[language].aiAnalyzing : t[language].analyzing}
                  </span>
                ) : (
                  t[language].visualizeBtn
                )}
              </button>
              <button
                type="button"
                onClick={handleExample}
                className="px-4 md:px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all text-sm md:text-base"
                disabled={loading}
              >
                {t[language].tryExample}
              </button>
            </div>

            {/* AI Mode Toggle */}
            <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setUseAI(!useAI)}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  useAI
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                disabled={loading}
              >
                {useAI ? `🤖 ${t[language].aiEnhanced}` : `⚡ ${t[language].fastMode}`}
              </button>
              <span className="text-xs text-gray-500 text-center">
                {useAI ? t[language].aiDesc : t[language].fastDesc}
              </span>
            </div>
          </form>
        </div>

        {/* Gemini Quota Error */}
        {aiError && (
          <div className="max-w-2xl mx-auto mb-6 md:mb-8 p-3 md:p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-start gap-2 md:gap-3">
            <FiAlertCircle className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-800 font-medium text-sm md:text-base">{t[language].quotaError}</p>
              <p className="text-yellow-700 text-xs md:text-sm">{aiError}</p>
              <p className="text-yellow-600 text-xs mt-2">
                💡 {t[language].quotaTip}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 md:mb-8 p-3 md:p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-2 md:gap-3">
            <FiAlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium text-sm md:text-base">{t[language].marketNotFound}</p>
              <p className="text-red-600 text-xs md:text-sm">{error}</p>
              <p className="text-red-500 text-xs mt-2">
                💡 {t[language].notFoundTip}
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {marketData && parsedRule && (
          <div className="space-y-4 md:space-y-6">
            {/* Risk Assessment Card */}
            {riskAssessment && (
              <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg md:text-xl font-bold text-gray-800">{t[language].riskScore}</h4>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    riskAssessment.level === 'low' ? 'bg-green-50' :
                    riskAssessment.level === 'medium' ? 'bg-yellow-50' :
                    'bg-red-50'
                  }`}>
                    <span className="text-2xl">{getRiskLevelDisplay(riskAssessment.level).emoji}</span>
                    <div>
                      <div className="font-bold text-xl">
                        <span className={
                          riskAssessment.level === 'low' ? 'text-green-700' :
                          riskAssessment.level === 'medium' ? 'text-yellow-700' :
                          'text-red-700'
                        }>{riskAssessment.score}</span>
                        <span className="text-gray-500 text-sm">/100</span>
                      </div>
                      <div className={`text-xs font-medium ${
                        riskAssessment.level === 'low' ? 'text-green-600' :
                        riskAssessment.level === 'medium' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {language === 'en' ? getRiskLevelDisplay(riskAssessment.level).label : getRiskLevelDisplay(riskAssessment.level).labelZh}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Details */}
                <div className="grid gap-3 md:gap-4">
                  {/* Risks */}
                  {riskAssessment.risks.length > 0 && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                      <p className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                        <span>⚠️</span> {t[language].risks}:
                      </p>
                      <ul className="space-y-1">
                        {riskAssessment.risks.map((risk, i) => (
                          <li key={i} className="text-xs md:text-sm text-red-700 flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {riskAssessment.warnings.length > 0 && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                      <p className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                        <span>💡</span> {t[language].warnings}:
                      </p>
                      <ul className="space-y-1">
                        {riskAssessment.warnings.map((warning, i) => (
                          <li key={i} className="text-xs md:text-sm text-yellow-700 flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Strengths */}
                  {riskAssessment.strengths.length > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                      <p className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                        <span>✅</span> {t[language].strengths}:
                      </p>
                      <ul className="space-y-1">
                        {riskAssessment.strengths.map((strength, i) => (
                          <li key={i} className="text-xs md:text-sm text-green-700 flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Market Info Card */}
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
              <div className="flex flex-col md:flex-row items-start justify-between gap-3 md:gap-4 mb-4">
                <div className="flex-1 w-full">
                  <h3 className="text-lg md:text-2xl font-bold text-gray-800 mb-2">
                    {marketData.question}
                  </h3>
                  {marketData.category && (
                    <span className="inline-block px-2 md:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs md:text-sm font-medium">
                      {marketData.category}
                    </span>
                  )}
                </div>
                <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                  <div className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-green-50 rounded-lg flex-1 md:flex-initial">
                    <FiCheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                    <span className="text-green-700 font-semibold text-xs md:text-base">
                      {parsedRule.coverageRate}% {t[language].analyzed}
                    </span>
                  </div>
                  {parsedRule.aiGenerated && (
                    <div className="flex items-center gap-1 px-2 md:px-3 py-1 bg-emerald-50 rounded-lg">
                      <span className="text-emerald-700 text-xs font-medium whitespace-nowrap">
                        🤖 {t[language].aiEnhanced}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 md:p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  <span className="font-semibold text-blue-700">{t[language].summary}:</span>{' '}
                  {parsedRule.summary}
                </p>
              </div>

              {/* Event Markets - Show all possible outcomes */}
              {marketData.isEvent && marketData.markets && marketData.markets.length > 0 && (
                <div className="mt-3 md:mt-4">
                  <p className="text-xs md:text-sm font-semibold text-gray-600 mb-3">
                    📊 {t[language].marketOptions} ({marketData.markets.length} {t[language].total}):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {marketData.markets.map((market, index) => {
                      const probability = parseFloat(market.outcomePrices[0] || '0') * 100;
                      return (
                        <div
                          key={index}
                          className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 flex items-center justify-between hover:shadow-md transition-shadow"
                        >
                          <span className="text-gray-800 font-medium text-sm flex-1">
                            {market.question.replace(/^Will /, '').replace(/\?$/, '')}
                          </span>
                          <span className="ml-3 px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-bold">
                            {probability.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detected Patterns */}
              {parsedRule.detectedPatterns.length > 0 && (
                <div className="mt-3 md:mt-4">
                  <p className="text-xs md:text-sm text-gray-600 mb-2">{t[language].detectedPatterns}:</p>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {parsedRule.detectedPatterns.map((pattern: string, index: number) => (
                      <span
                        key={`${pattern}-${index}`}
                        className="px-2 md:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                      >
                        {pattern.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Flowchart Card */}
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
              <h4 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4">{t[language].resolutionFlowchart}</h4>
              <MermaidChart chart={parsedRule.mermaidCode} />
            </div>

            {/* Original Rules Card */}
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 border border-gray-100">
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="w-full flex items-center justify-between text-left"
              >
                <h4 className="text-lg md:text-xl font-bold text-gray-800">{t[language].originalRules}</h4>
                <span className="text-blue-600 text-xs md:text-sm font-medium">
                  {showOriginal ? t[language].hide : t[language].show}
                </span>
              </button>

              {showOriginal && (
                <div className="mt-3 md:mt-4 space-y-3 md:space-y-4">
                  <div>
                    <p className="text-xs md:text-sm font-semibold text-gray-600 mb-2">{t[language].description}:</p>
                    <p className="text-sm md:text-base text-gray-700 leading-relaxed bg-gray-50 p-3 md:p-4 rounded-lg">
                      {marketData.description || t[language].noDescription}
                    </p>
                  </div>
                  {marketData.resolutionSource && (
                    <div>
                      <p className="text-xs md:text-sm font-semibold text-gray-600 mb-2">
                        {t[language].resolutionSource}:
                      </p>
                      <p className="text-sm md:text-base text-gray-700 bg-gray-50 p-3 md:p-4 rounded-lg">
                        {marketData.resolutionSource}
                      </p>
                    </div>
                  )}
                  {marketData.endDate && (
                    <div>
                      <p className="text-xs md:text-sm font-semibold text-gray-600 mb-2">{t[language].endDate}:</p>
                      <p className="text-sm md:text-base text-gray-700 bg-gray-50 p-3 md:p-4 rounded-lg">
                        {new Date(marketData.endDate).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* How it Works */}
        {!marketData && !loading && (
          <div className="max-w-4xl mx-auto mt-12 md:mt-16">
            <h3 className="text-xl md:text-2xl font-bold text-center text-gray-800 mb-6 md:mb-8">{t[language].howItWorks}</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-md border border-gray-100">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
                  <span className="text-xl md:text-2xl font-bold text-blue-600">1</span>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2 text-sm md:text-base">{t[language].step1Title}</h4>
                <p className="text-gray-600 text-xs md:text-sm">
                  {t[language].step1Desc}
                </p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-md border border-gray-100">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
                  <span className="text-xl md:text-2xl font-bold text-purple-600">2</span>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2 text-sm md:text-base">{t[language].step2Title}</h4>
                <p className="text-gray-600 text-xs md:text-sm">
                  {t[language].step2Desc}
                </p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-md border border-gray-100 sm:col-span-2 md:col-span-1">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
                  <span className="text-xl md:text-2xl font-bold text-green-600">3</span>
                </div>
                <h4 className="font-semibold text-gray-800 mb-2 text-sm md:text-base">{t[language].step3Title}</h4>
                <p className="text-gray-600 text-xs md:text-sm">
                  {t[language].step3Desc}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 md:mt-20 py-6 md:py-8 border-t border-gray-200 bg-white/50">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-600 text-xs md:text-sm">
          <p>
            {t[language].footerText1}
            <br />
            {t[language].footerText2}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {t[language].footerTech}
          </p>
        </div>
      </footer>
    </div>
  );
}
