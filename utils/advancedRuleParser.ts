export interface LogicNode {
  type: 'condition' | 'outcome' | 'start' | 'source' | 'process' | 'decision';
  id: string;
  label: string;
  value?: string;
  children?: LogicNode[];
}

export interface ParsedRule {
  nodes: LogicNode[];
  mermaidCode: string;
  summary: string;
  coverageRate: number;
  detectedPatterns: string[];
}

// Advanced pattern recognition
const ADVANCED_PATTERNS = {
  // Resolution sources and verification
  OFFICIAL_SOURCE: /(?:resolution source|source|according to|based on|published at|official|announced by).*?(https?:\/\/[^\s]+|[A-Z][a-zA-Z\s]+(?:Committee|Reserve|Bureau|Agency|Department|Board|Administration|Commission))/gi,

  // Multi-step resolution process
  RESOLUTION_STEPS: /(?:will resolve|resolves to|resolution will be|market resolves)/gi,

  // Conditional logic
  IF_CONDITION: /if\s+([^,\.]+?)(?:,|\.|then)/gi,
  UNLESS_CONDITION: /unless\s+([^,\.]+?)(?:,|\.)/gi,

  // Time windows and deadlines
  SCHEDULED_DATE: /scheduled for\s+([A-Za-z]+\s+\d+(?:\s*-\s*\d+)?,?\s+\d{4})/gi,
  END_DATE: /by\s+(?:the\s+)?end\s+(?:date\s+)?of\s+([^,\.]+)/gi,
  MEETING_DATE: /meeting.*?(?:scheduled for|on)\s+([A-Za-z]+\s+\d+(?:\s*-\s*\d+)?,?\s+\d{4})/gi,

  // Numerical thresholds and changes
  BASIS_POINTS: /(\d+\.?\d*)\s*(?:basis points?|bps?)/gi,
  PERCENTAGE: /(\d+\.?\d*)%/gi,
  CHANGE_BY: /changed? by\s+([^,\.]+)/gi,
  VERSUS_PRIOR: /versus\s+(?:the\s+)?(?:level|rate|value).*?prior to/gi,

  // Rounding rules
  ROUNDING_RULE: /(?:rounded|will be rounded)\s+(?:up|down)?\s*to\s+(?:the\s+)?nearest\s+(\d+)/gi,

  // Fallback conditions
  NO_STATEMENT: /if no statement.*?(?:by|before)\s+([^,\.]+)/gi,
  DEFAULT_RESOLUTION: /will resolve to\s+(?:the\s+)?["']?([^"',\.]+)["']?/gi,

  // Data extraction points
  EXTRACT_FROM: /(?:defined|expressed|published|issued|released).*?(?:in|at|by)\s+([^,\.]+)/gi,

  // Brackets and options
  BRACKET_OPTIONS: /displayed options|relevant bracket|expressed in/gi,
  NOT_EXPRESSED: /not expressed in.*?options/gi,
};

export function parseAdvancedMarketRules(
  question: string,
  description: string,
  resolutionSource?: string,
  markets?: Array<{question: string; outcomes: string[]}>
): ParsedRule {
  const fullText = `${question} ${description}`;
  const detectedPatterns: string[] = [];
  const nodes: LogicNode[] = [];
  let nodeCounter = 0;

  // Generate unique node IDs
  const getNodeId = () => {
    const id = String.fromCharCode(65 + nodeCounter); // A, B, C, ...
    nodeCounter++;
    return id;
  };

  // Start node
  const startId = getNodeId();
  nodes.push({
    type: 'start',
    id: startId,
    label: 'Market Opens',
  });

  // Parse resolution timeline
  const timeline = parseResolutionTimeline(fullText, detectedPatterns);
  let lastNodeId = startId;

  timeline.forEach((step, index) => {
    const stepId = getNodeId();
    nodes.push({
      type: 'process',
      id: stepId,
      label: step.label,
      value: step.value,
    });

    if (index === 0) {
      // Connect from start
      lastNodeId = stepId;
    } else {
      lastNodeId = stepId;
    }
  });

  // Parse data sources
  const sources = parseDataSources(fullText, resolutionSource, detectedPatterns);
  const sourceNodes: string[] = [];

  sources.forEach(source => {
    const sourceId = getNodeId();
    sourceNodes.push(sourceId);
    nodes.push({
      type: 'source',
      id: sourceId,
      label: source.label,
      value: source.url,
    });
  });

  // Parse conditional logic
  const conditions = parseConditionalLogic(fullText, markets, detectedPatterns);
  let conditionChainStart = lastNodeId;

  conditions.forEach((condition, index) => {
    const conditionId = getNodeId();
    nodes.push({
      type: 'decision',
      id: conditionId,
      label: condition.label,
      value: condition.value,
    });

    if (index === 0 && timeline.length > 0) {
      conditionChainStart = conditionId;
    }
  });

  // Parse outcomes (for Event markets, use actual market options)
  const outcomes = parseOutcomes(markets, detectedPatterns);
  outcomes.forEach(outcome => {
    const outcomeId = getNodeId();
    nodes.push({
      type: 'outcome',
      id: outcomeId,
      label: outcome.label,
      value: outcome.value,
    });
  });

  // Parse fallback/default conditions
  const fallbacks = parseFallbackConditions(fullText, detectedPatterns);
  fallbacks.forEach(fallback => {
    const fallbackId = getNodeId();
    nodes.push({
      type: 'decision',
      id: fallbackId,
      label: fallback.label,
      value: fallback.value,
    });
  });

  // Generate Mermaid code with proper flow
  const mermaidCode = generateAdvancedMermaidCode(
    nodes,
    question,
    timeline.length,
    conditions.length,
    outcomes.length,
    fallbacks.length,
    sourceNodes
  );

  // Generate comprehensive summary
  const summary = generateAdvancedSummary(question, nodes, detectedPatterns, markets);

  // Calculate coverage rate
  const coverageRate = calculateAdvancedCoverageRate(detectedPatterns, fullText, conditions.length, timeline.length);

  return {
    nodes,
    mermaidCode,
    summary,
    coverageRate,
    detectedPatterns,
  };
}

function parseResolutionTimeline(text: string, patterns: string[]): Array<{label: string; value?: string}> {
  const steps: Array<{label: string; value?: string}> = [];

  // Look for scheduled meetings/events
  const meetingMatches = Array.from(text.matchAll(ADVANCED_PATTERNS.MEETING_DATE));
  if (meetingMatches.length > 0) {
    patterns.push('scheduled_event');
    meetingMatches.forEach(match => {
      steps.push({
        label: `Await Meeting: ${match[1]}`,
        value: match[1],
      });
    });
  }

  // Look for statement release
  if (text.match(/statement|announcement|release/i)) {
    patterns.push('awaiting_statement');
    steps.push({
      label: 'Statement Released',
      value: 'Official announcement',
    });
  }

  // Look for data extraction
  if (text.match(/level.*(?:published|issued|reported)/i)) {
    patterns.push('data_extraction');
    steps.push({
      label: 'Extract Data from Statement',
      value: 'Parse official numbers',
    });
  }

  return steps;
}

function parseDataSources(text: string, resolutionSource: string | undefined, patterns: string[]): Array<{label: string; url?: string}> {
  const sources: Array<{label: string; url?: string}> = [];

  // Extract official sources
  const sourceMatches = Array.from(text.matchAll(ADVANCED_PATTERNS.OFFICIAL_SOURCE));
  if (sourceMatches.length > 0 || resolutionSource) {
    patterns.push('official_source');

    sourceMatches.forEach(match => {
      const source = match[1];
      if (source.startsWith('http')) {
        const domain = source.match(/https?:\/\/([^\/]+)/)?.[1] || source;
        sources.push({
          label: `Source: ${domain}`,
          url: source,
        });
      } else {
        sources.push({
          label: `Authority: ${source.trim()}`,
        });
      }
    });
  }

  return sources;
}

function parseConditionalLogic(
  text: string,
  markets: Array<{question: string; outcomes: string[]}> | undefined,
  patterns: string[]
): Array<{label: string; value?: string}> {
  const conditions: Array<{label: string; value?: string}> = [];

  // For Event markets with multiple options, create branching logic
  if (markets && markets.length > 1) {
    if (!patterns.includes('multi_option_logic')) {
      patterns.push('multi_option_logic');
    }

    // Extract the key decision variable
    if (text.match(/basis points?|bps?/i)) {
      if (!patterns.includes('basis_points_change')) {
        patterns.push('basis_points_change');
      }
      conditions.push({
        label: 'Calculate Change in bps',
        value: 'Compare vs prior level',
      });

      // Check for rounding rules
      const roundingMatch = text.match(ADVANCED_PATTERNS.ROUNDING_RULE);
      if (roundingMatch) {
        if (!patterns.includes('rounding_rule')) {
          patterns.push('rounding_rule');
        }
        conditions.push({
          label: `Round to nearest ${roundingMatch[1]} bps`,
          value: roundingMatch[1],
        });
      }

      conditions.push({
        label: 'Match to bracket?',
        value: 'Find corresponding option',
      });
    }
  }

  // Look for explicit if/unless conditions
  const ifMatches = Array.from(text.matchAll(ADVANCED_PATTERNS.IF_CONDITION));
  if (ifMatches.length > 0 && !patterns.includes('if_condition')) {
    patterns.push('if_condition');
  }
  ifMatches.forEach(match => {
    conditions.push({
      label: `If: ${match[1].trim()}?`,
      value: match[1].trim(),
    });
  });

  const unlessMatches = Array.from(text.matchAll(ADVANCED_PATTERNS.UNLESS_CONDITION));
  if (unlessMatches.length > 0 && !patterns.includes('unless_condition')) {
    patterns.push('unless_condition');
  }
  unlessMatches.forEach(match => {
    conditions.push({
      label: `Unless: ${match[1].trim()}?`,
      value: match[1].trim(),
    });
  });

  // Look for versus/comparison logic
  if (text.match(ADVANCED_PATTERNS.VERSUS_PRIOR)) {
    if (!patterns.includes('versus_comparison')) {
      patterns.push('versus_comparison');
    }
    conditions.push({
      label: 'Compare vs Prior Level',
      value: 'Before meeting vs after',
    });
  }

  return conditions;
}

function parseOutcomes(
  markets: Array<{question: string; outcomes: string[]}> | undefined,
  patterns: string[]
): Array<{label: string; value?: string}> {
  const outcomes: Array<{label: string; value?: string}> = [];

  if (markets && markets.length > 1) {
    // For Event markets, show actual options
    patterns.push('multiple_outcomes');

    // Group similar options
    const groupedMarkets = markets.slice(0, 5); // Show top 5
    groupedMarkets.forEach(market => {
      // Extract key part of question
      const keyPart = market.question
        .replace(/^Will\s+/i, '')
        .replace(/\?$/, '')
        .split(/after|following|in/)[0]
        .trim();

      outcomes.push({
        label: keyPart,
        value: market.question,
      });
    });

    if (markets.length > 5) {
      outcomes.push({
        label: `...${markets.length - 5} more options`,
        value: 'Additional brackets',
      });
    }
  } else {
    // Simple YES/NO
    outcomes.push(
      { label: 'YES', value: 'Condition met' },
      { label: 'NO', value: 'Condition not met' }
    );
  }

  return outcomes;
}

function parseFallbackConditions(text: string, patterns: string[]): Array<{label: string; value?: string}> {
  const fallbacks: Array<{label: string; value?: string}> = [];

  // No statement fallback
  const noStatementMatch = text.match(ADVANCED_PATTERNS.NO_STATEMENT);
  if (noStatementMatch) {
    if (!patterns.includes('no_statement_fallback')) {
      patterns.push('no_statement_fallback');
    }
    fallbacks.push({
      label: 'No statement released?',
      value: 'Fallback condition',
    });
  }

  // Default resolution
  const defaultMatches = Array.from(text.matchAll(ADVANCED_PATTERNS.DEFAULT_RESOLUTION));
  if (defaultMatches.length > 0 && !patterns.includes('default_resolution')) {
    patterns.push('default_resolution');
  }
  defaultMatches.forEach(match => {
    if (match[1] && match[1].length < 50) {
      fallbacks.push({
        label: `Default: ${match[1].trim()}`,
        value: match[1].trim(),
      });
    }
  });

  return fallbacks;
}

function generateAdvancedMermaidCode(
  nodes: LogicNode[],
  question: string,
  timelineSteps: number,
  conditionSteps: number,
  outcomeCount: number,
  fallbackCount: number,
  sourceNodeIds: string[]
): string {
  let code = 'flowchart TD\n';

  const start = nodes.find(n => n.type === 'start');
  const timeline = nodes.filter(n => n.type === 'process');
  const sources = nodes.filter(n => n.type === 'source');
  const decisions = nodes.filter(n => n.type === 'decision');
  const outcomes = nodes.filter(n => n.type === 'outcome');

  if (!start) return code;

  // Start node
  code += `    ${start.id}([${start.label}])\n`;

  let currentNode = start.id;

  // Timeline flow
  timeline.forEach((step, index) => {
    code += `    ${step.id}[${step.label}]\n`;
    code += `    ${currentNode} --> ${step.id}\n`;
    currentNode = step.id;
  });

  // Connect sources as side info
  sources.forEach(source => {
    code += `    ${source.id}[["📊 ${source.label}"]]\n`;
    if (timeline.length > 0) {
      code += `    ${timeline[0].id} -.-> ${source.id}\n`;
    }
  });

  // Decision logic
  if (decisions.length > 0) {
    decisions.forEach((decision, index) => {
      code += `    ${decision.id}{${decision.label}}\n`;

      if (index === 0) {
        code += `    ${currentNode} --> ${decision.id}\n`;
      }

      if (index < decisions.length - 1) {
        // Chain to next decision
        const nextDecision = decisions[index + 1];
        code += `    ${decision.id} -->|Process| ${nextDecision.id}\n`;
      } else {
        // Last decision connects to outcomes
        if (outcomes.length <= 2) {
          // Simple YES/NO
          code += `    ${decision.id} -->|Match| ${outcomes[0]?.id}[${outcomes[0]?.label}]\n`;
          code += `    ${decision.id} -->|No Match| ${outcomes[1]?.id}[${outcomes[1]?.label}]\n`;
        } else {
          // Multiple outcomes - create branches
          outcomes.forEach((outcome, oIndex) => {
            if (oIndex < 3) {
              code += `    ${decision.id} --> ${outcome.id}[${outcome.label}]\n`;
            } else if (oIndex === 3) {
              code += `    ${decision.id} -.-> ${outcome.id}[${outcome.label}]\n`;
            }
          });
        }
      }
    });
  } else if (outcomes.length > 0) {
    // No decisions, direct to outcomes
    outcomes.forEach((outcome, index) => {
      code += `    ${outcome.id}[${outcome.label}]\n`;
      if (index < 2) {
        code += `    ${currentNode} --> ${outcome.id}\n`;
      }
    });
  }

  // Styling
  code += `    style ${start.id} fill:#e1f5ff,stroke:#01579b,stroke-width:3px\n`;

  timeline.forEach(t => {
    code += `    style ${t.id} fill:#f3e5f5,stroke:#4a148c,stroke-width:2px\n`;
  });

  sources.forEach(s => {
    code += `    style ${s.id} fill:#fff8e1,stroke:#f57f17,stroke-width:2px\n`;
  });

  decisions.forEach(d => {
    code += `    style ${d.id} fill:#e0f2f1,stroke:#004d40,stroke-width:2px\n`;
  });

  outcomes.forEach(o => {
    if (o.label === 'YES' || !o.label.includes('...')) {
      code += `    style ${o.id} fill:#c8e6c9,stroke:#1b5e20,stroke-width:3px\n`;
    } else if (o.label === 'NO') {
      code += `    style ${o.id} fill:#ffcdd2,stroke:#b71c1c,stroke-width:3px\n`;
    } else {
      code += `    style ${o.id} fill:#e1bee7,stroke:#4a148c,stroke-width:2px\n`;
    }
  });

  return code;
}

function generateAdvancedSummary(
  question: string,
  nodes: LogicNode[],
  patterns: string[],
  markets: Array<{question: string}> | undefined
): string {
  const timeline = nodes.filter(n => n.type === 'process');
  const decisions = nodes.filter(n => n.type === 'decision');
  const sources = nodes.filter(n => n.type === 'source');

  let summary = `This market tracks: "${question}". `;

  if (timeline.length > 0) {
    summary += `Resolution process: ${timeline.map(t => t.label.toLowerCase()).join(' → ')}. `;
  }

  if (decisions.length > 0) {
    summary += `Decision logic: ${decisions.map(d => d.label.replace('?', '')).join(', then ')}. `;
  }

  if (markets && markets.length > 2) {
    summary += `The market offers ${markets.length} distinct outcome brackets. `;
  }

  if (sources.length > 0) {
    summary += `Data verified from official sources. `;
  }

  return summary;
}

function calculateAdvancedCoverageRate(
  patterns: string[],
  fullText: string,
  conditionCount: number,
  timelineCount: number
): number {
  let rate = 50; // Base rate

  // Timeline detection
  if (timelineCount > 0) rate += 15;
  if (timelineCount > 2) rate += 10;

  // Conditional logic
  if (conditionCount > 0) rate += 10;
  if (conditionCount > 2) rate += 5;

  // Pattern complexity
  if (patterns.includes('basis_points_change')) rate += 5;
  if (patterns.includes('rounding_rule')) rate += 5;
  if (patterns.includes('official_source')) rate += 5;
  if (patterns.includes('multi_option_logic')) rate += 5;

  return Math.min(rate, 95);
}
