export interface RiskAssessment {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high';
  risks: string[];
  warnings: string[];
  strengths: string[];
}

export interface RiskFactors {
  clarityScore: number;
  timeAmbiguityPenalty: number;
  dataSourceReliability: number;
  edgeCaseComplexity: number;
  verificationDifficulty: number;
}

/**
 * 分析市场规则的风险程度
 */
export function assessMarketRisk(
  question: string,
  description: string,
  resolutionSource?: string,
  markets?: Array<{ question: string }>
): RiskAssessment {
  let score = 100;
  const risks: string[] = [];
  const warnings: string[] = [];
  const strengths: string[] = [];

  // 1. 规则长度与复杂度分析
  const descLength = description.length;
  if (descLength < 200) {
    score -= 15;
    risks.push('Rule description is very brief, may lack important details');
  } else if (descLength > 2000) {
    score -= 10;
    warnings.push('Very long rule description, contains many conditional clauses');
  } else {
    strengths.push('Rule length is appropriate, detailed yet clear');
  }

  // 2. 时间相关的模糊性检测
  const timePatterns = {
    vague: /approximately|around|about|roughly|near|close to/gi,
    specific: /\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}|UTC|EST|GMT/g,
    deadline: /deadline|expires|ends on|until|by/gi,
  };

  const hasVagueTime = timePatterns.vague.test(description);
  const hasSpecificTime = timePatterns.specific.test(description);
  const hasDeadline = timePatterns.deadline.test(description);

  if (hasVagueTime) {
    score -= 15;
    risks.push('Contains vague time expressions (e.g., "approximately", "around")');
  }

  if (!hasSpecificTime && hasDeadline) {
    score -= 10;
    warnings.push('Deadline mentioned but no specific timestamp provided');
  }

  if (hasSpecificTime) {
    strengths.push('Clear timestamp and timezone specified');
  }

  // 3. 数据源可靠性分析
  if (!resolutionSource) {
    score -= 20;
    risks.push('No official data source specified');
  } else {
    // 可靠的数据源
    const reliableSources = [
      'federal reserve',
      'official',
      'government',
      '.gov',
      'sec.gov',
      'federalregister',
      'census.gov',
      'bloomberg',
      'reuters',
    ];

    // 不可靠的数据源
    const unreliableSources = [
      'twitter',
      'reddit',
      'telegram',
      'discord',
      'poll',
      'vote',
      'community decision',
    ];

    const sourceLower = resolutionSource.toLowerCase();
    const hasReliableSource = reliableSources.some((s) => sourceLower.includes(s));
    const hasUnreliableSource = unreliableSources.some((s) => sourceLower.includes(s));

    if (hasReliableSource) {
      strengths.push('Uses official/authoritative data source');
    } else if (hasUnreliableSource) {
      score -= 25;
      risks.push('Data source is social media or community-based, high subjectivity risk');
    } else {
      score -= 5;
      warnings.push('Data source reliability unclear');
    }
  }

  // 4. 边界条件与条件分支复杂度
  const conditionalPatterns = {
    if: /\bif\b|\bwhen\b|\bshould\b/gi,
    unless: /\bunless\b|\bexcept\b|\bhowever\b/gi,
    fallback: /\bin case\b|\botherwise\b|\balternatively\b|\bdefault\b/gi,
    versus: /\bversus\b|\bvs\b|\bcompared to\b/gi,
  };

  const ifMatches = description.match(conditionalPatterns.if) || [];
  const unlessMatches = description.match(conditionalPatterns.unless) || [];
  const fallbackMatches = description.match(conditionalPatterns.fallback) || [];
  const versusMatches = description.match(conditionalPatterns.versus) || [];

  const totalBranches = ifMatches.length + unlessMatches.length + fallbackMatches.length;

  if (totalBranches > 5) {
    score -= 15;
    risks.push(`Contains ${totalBranches} conditional branches, logic is complex`);
  } else if (totalBranches > 2) {
    score -= 5;
    warnings.push(`Contains ${totalBranches} conditional clauses, requires careful reading`);
  }

  if (unlessMatches.length > 0) {
    score -= unlessMatches.length * 3;
    warnings.push(`Contains ${unlessMatches.length} exception clause(s)`);
  }

  if (fallbackMatches.length > 0) {
    strengths.push('Has clear fallback mechanism');
  } else if (totalBranches > 2) {
    score -= 8;
    warnings.push('Complex conditions but no fallback mechanism defined');
  }

  // 5. Event市场特殊分析
  if (markets && markets.length > 0) {
    if (markets.length > 10) {
      score -= 5;
      warnings.push(`Too many options (${markets.length}), verification may be complex`);
    } else {
      strengths.push(`Clear options (${markets.length} total)`);
    }
  }

  // 6. 数值精度与舍入规则
  const precisionPatterns = {
    rounding: /round(ed)?|nearest|decimal|precision/gi,
    basisPoints: /basis points?|bps/gi,
    percentage: /\d+(\.\d+)?%/g,
  };

  const hasRounding = precisionPatterns.rounding.test(description);
  const hasBasisPoints = precisionPatterns.basisPoints.test(description);

  if (hasRounding || hasBasisPoints) {
    if (hasRounding) {
      strengths.push('Explicit rounding rules defined');
    }
    if (hasBasisPoints) {
      strengths.push('Uses standard basis points notation');
    }
  } else if (description.match(precisionPatterns.percentage)) {
    score -= 5;
    warnings.push('Contains percentages but rounding method unclear');
  }

  // 7. 歧义词汇检测
  const ambiguousTerms = [
    'may',
    'might',
    'could',
    'possibly',
    'likely',
    'probably',
    'significant',
    'substantial',
    'major',
    'minor',
  ];

  const foundAmbiguous = ambiguousTerms.filter((term) =>
    new RegExp(`\\b${term}\\b`, 'i').test(description)
  );

  if (foundAmbiguous.length > 0) {
    score -= foundAmbiguous.length * 3;
    warnings.push(`Contains ambiguous terms: ${foundAmbiguous.slice(0, 3).join(', ')}`);
  }

  // 8. 验证难度评估
  const verificationKeywords = {
    easy: ['price', 'official announcement', 'published', 'reported'],
    hard: ['intent', 'opinion', 'belief', 'considers', 'views as'],
  };

  const hasEasyVerification = verificationKeywords.easy.some((kw) =>
    description.toLowerCase().includes(kw)
  );
  const hasHardVerification = verificationKeywords.hard.some((kw) =>
    description.toLowerCase().includes(kw)
  );

  if (hasHardVerification) {
    score -= 20;
    risks.push('Resolution requires subjective judgment, high dispute risk');
  } else if (hasEasyVerification) {
    strengths.push('Objective verification criteria');
  }

  // 确保分数在 0-100 范围内
  score = Math.max(0, Math.min(100, Math.round(score)));

  // 确定风险等级
  let level: 'low' | 'medium' | 'high';
  if (score >= 80) {
    level = 'low';
  } else if (score >= 60) {
    level = 'medium';
  } else {
    level = 'high';
  }

  return {
    score,
    level,
    risks,
    warnings,
    strengths,
  };
}

/**
 * 获取风险等级的显示信息
 */
export function getRiskLevelDisplay(level: 'low' | 'medium' | 'high') {
  switch (level) {
    case 'low':
      return {
        label: 'Low Risk',
        labelZh: '低风险',
        color: 'green',
        emoji: '🟢',
        description: 'Clear rules, low dispute probability',
        descriptionZh: '规则清晰，争议概率低',
      };
    case 'medium':
      return {
        label: 'Medium Risk',
        labelZh: '中等风险',
        color: 'yellow',
        emoji: '🟡',
        description: 'Contains ambiguous clauses, read carefully',
        descriptionZh: '存在模糊条款，需仔细阅读',
      };
    case 'high':
      return {
        label: 'High Risk',
        labelZh: '高风险',
        color: 'red',
        emoji: '🔴',
        description: 'Complex rules or subjective judgment, high caution required',
        descriptionZh: '规则复杂或需主观判断，需高度谨慎',
      };
  }
}
