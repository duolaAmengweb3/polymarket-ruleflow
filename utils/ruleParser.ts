export interface LogicNode {
  type: 'condition' | 'outcome' | 'start' | 'source';
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

// Pattern templates for rule parsing
const PATTERNS = {
  // Time conditions
  TIME_BEFORE: /before\s+([A-Za-z]+\s+\d+,?\s+\d{4})/gi,
  TIME_AFTER: /after\s+([A-Za-z]+\s+\d+,?\s+\d{4})/gi,
  TIME_BY: /by\s+([A-Za-z]+\s+\d+,?\s+\d{4})/gi,

  // Comparison conditions
  GREATER_THAN: /(above|greater than|more than|exceeds?)\s+(\$?[\d,]+\.?\d*[kKmMbB]?)/gi,
  LESS_THAN: /(below|less than|under|falls? below)\s+(\$?[\d,]+\.?\d*[kKmMbB]?)/gi,
  EQUAL_TO: /(equal to|exactly)\s+(\$?[\d,]+\.?\d*[kKmMbB]?)/gi,

  // Logical operators
  IF_THEN: /if\s+(.+?)\s+then/gi,
  UNLESS: /unless\s+(.+?)[,\.]/gi,
  AND: /\s+and\s+/gi,
  OR: /\s+or\s+/gi,

  // Data sources
  BASED_ON: /based on\s+(.+?)(?:\.|,|$)/gi,
  ACCORDING_TO: /according to\s+(.+?)(?:\.|,|$)/gi,
  SOURCE: /source[:\s]+(.+?)(?:\.|,|$)/gi,

  // Frequency/Occurrence
  AT_LEAST: /at least\s+(\d+)/gi,
  AT_MOST: /at most\s+(\d+)/gi,
  WITHIN: /within\s+(\d+\s+\w+)/gi,

  // Boolean outcomes
  YES_NO: /(yes|no)\b/gi,
  TRUE_FALSE: /(true|false)\b/gi,
};

export function parseMarketRules(
  question: string,
  description: string,
  resolutionSource?: string
): ParsedRule {
  const fullText = `${question} ${description}`;
  const detectedPatterns: string[] = [];
  const nodes: LogicNode[] = [];
  let nodeCounter = 0;

  // Start node
  const startNode: LogicNode = {
    type: 'start',
    id: 'A',
    label: 'Market Start',
  };
  nodes.push(startNode);

  // Detect time conditions
  const timeBeforeMatches = Array.from(fullText.matchAll(PATTERNS.TIME_BEFORE));
  const timeAfterMatches = Array.from(fullText.matchAll(PATTERNS.TIME_AFTER));
  const timeByMatches = Array.from(fullText.matchAll(PATTERNS.TIME_BY));

  if (timeBeforeMatches.length > 0 || timeAfterMatches.length > 0 || timeByMatches.length > 0) {
    detectedPatterns.push('time_condition');
    timeBeforeMatches.forEach(match => {
      nodes.push({
        type: 'condition',
        id: String.fromCharCode(66 + nodeCounter++),
        label: `Before ${match[1]}?`,
        value: match[1],
      });
    });
    timeAfterMatches.forEach(match => {
      nodes.push({
        type: 'condition',
        id: String.fromCharCode(66 + nodeCounter++),
        label: `After ${match[1]}?`,
        value: match[1],
      });
    });
    timeByMatches.forEach(match => {
      nodes.push({
        type: 'condition',
        id: String.fromCharCode(66 + nodeCounter++),
        label: `By ${match[1]}?`,
        value: match[1],
      });
    });
  }

  // Detect comparison conditions
  const greaterMatches = Array.from(fullText.matchAll(PATTERNS.GREATER_THAN));
  const lessMatches = Array.from(fullText.matchAll(PATTERNS.LESS_THAN));

  if (greaterMatches.length > 0) {
    detectedPatterns.push('threshold_greater');
    greaterMatches.forEach(match => {
      nodes.push({
        type: 'condition',
        id: String.fromCharCode(66 + nodeCounter++),
        label: `Value > ${match[2]}?`,
        value: match[2],
      });
    });
  }

  if (lessMatches.length > 0) {
    detectedPatterns.push('threshold_less');
    lessMatches.forEach(match => {
      nodes.push({
        type: 'condition',
        id: String.fromCharCode(66 + nodeCounter++),
        label: `Value < ${match[2]}?`,
        value: match[2],
      });
    });
  }

  // Detect frequency conditions
  const atLeastMatches = Array.from(fullText.matchAll(PATTERNS.AT_LEAST));
  if (atLeastMatches.length > 0) {
    detectedPatterns.push('frequency');
    atLeastMatches.forEach(match => {
      nodes.push({
        type: 'condition',
        id: String.fromCharCode(66 + nodeCounter++),
        label: `At least ${match[1]} times?`,
        value: match[1],
      });
    });
  }

  // Detect data sources
  if (resolutionSource) {
    detectedPatterns.push('data_source');
    nodes.push({
      type: 'source',
      id: String.fromCharCode(66 + nodeCounter++),
      label: `Data: ${resolutionSource}`,
      value: resolutionSource,
    });
  }

  const basedOnMatches = Array.from(fullText.matchAll(PATTERNS.BASED_ON));
  basedOnMatches.forEach(match => {
    if (!detectedPatterns.includes('data_source')) {
      detectedPatterns.push('data_source');
    }
    nodes.push({
      type: 'source',
      id: String.fromCharCode(66 + nodeCounter++),
      label: `Source: ${match[1].trim()}`,
      value: match[1].trim(),
    });
  });

  // Add outcome nodes
  const yesNode: LogicNode = {
    type: 'outcome',
    id: String.fromCharCode(66 + nodeCounter++),
    label: 'YES',
  };
  const noNode: LogicNode = {
    type: 'outcome',
    id: String.fromCharCode(66 + nodeCounter++),
    label: 'NO',
  };
  nodes.push(yesNode, noNode);

  // Generate Mermaid code
  const mermaidCode = generateMermaidCode(nodes, question);

  // Generate summary
  const summary = generateSummary(question, nodes, detectedPatterns);

  // Calculate coverage rate
  const coverageRate = calculateCoverageRate(detectedPatterns, fullText);

  return {
    nodes,
    mermaidCode,
    summary,
    coverageRate,
    detectedPatterns,
  };
}

function generateMermaidCode(nodes: LogicNode[], question: string): string {
  let code = 'flowchart TD\n';

  // Start node
  code += '    A[Market Start]\n';

  // Get condition, source, and outcome nodes
  const conditions = nodes.filter(n => n.type === 'condition');
  const sources = nodes.filter(n => n.type === 'source');
  const outcomes = nodes.filter(n => n.type === 'outcome');

  if (conditions.length === 0) {
    // Simple yes/no without conditions
    code += `    A --> ${outcomes[0]?.id || 'B'}[${outcomes[0]?.label || 'YES'}]\n`;
    code += `    A --> ${outcomes[1]?.id || 'C'}[${outcomes[1]?.label || 'NO'}]\n`;
  } else {
    // Link start to first condition
    code += `    A --> ${conditions[0].id}{${conditions[0].label}}\n`;

    // Link conditions
    for (let i = 0; i < conditions.length; i++) {
      const current = conditions[i];
      const next = conditions[i + 1];

      if (next) {
        code += `    ${current.id} -->|Yes| ${next.id}{${next.label}}\n`;
        code += `    ${current.id} -->|No| ${outcomes[1]?.id || 'Z'}[${outcomes[1]?.label || 'NO'}]\n`;
      } else {
        // Last condition links to outcomes
        code += `    ${current.id} -->|Yes| ${outcomes[0]?.id || 'Y'}[${outcomes[0]?.label || 'YES'}]\n`;
        code += `    ${current.id} -->|No| ${outcomes[1]?.id || 'Z'}[${outcomes[1]?.label || 'NO'}]\n`;
      }
    }
  }

  // Add source nodes as separate info boxes
  sources.forEach(source => {
    code += `    ${source.id}[["📊 ${source.label}"]]\n`;
  });

  // Style nodes
  code += `    style A fill:#e3f2fd,stroke:#1976d2,stroke-width:2px\n`;
  outcomes.forEach(outcome => {
    if (outcome.label === 'YES') {
      code += `    style ${outcome.id} fill:#c8e6c9,stroke:#388e3c,stroke-width:2px\n`;
    } else {
      code += `    style ${outcome.id} fill:#ffcdd2,stroke:#d32f2f,stroke-width:2px\n`;
    }
  });
  sources.forEach(source => {
    code += `    style ${source.id} fill:#fff3e0,stroke:#f57c00,stroke-width:2px\n`;
  });

  return code;
}

function generateSummary(question: string, nodes: LogicNode[], patterns: string[]): string {
  const conditions = nodes.filter(n => n.type === 'condition');

  if (conditions.length === 0) {
    return `This market asks: "${question}". The resolution will be determined based on the outcome.`;
  }

  let summary = `This market resolves to YES if `;
  const conditionDescriptions = conditions.map(c => {
    if (c.label.includes('Before') || c.label.includes('After') || c.label.includes('By')) {
      return c.label.replace('?', '').toLowerCase();
    }
    if (c.label.includes('>') || c.label.includes('<')) {
      return `the value meets the threshold (${c.label.replace('?', '')})`;
    }
    return c.label.replace('?', '').toLowerCase();
  });

  if (conditionDescriptions.length === 1) {
    summary += conditionDescriptions[0];
  } else {
    summary += conditionDescriptions.slice(0, -1).join(', ') + ' and ' + conditionDescriptions[conditionDescriptions.length - 1];
  }

  summary += ', otherwise it resolves to NO.';

  return summary;
}

function calculateCoverageRate(patterns: string[], fullText: string): number {
  // Simple heuristic: each detected pattern covers ~20% of complexity
  const baseRate = Math.min(patterns.length * 20, 80);

  // Bonus for comprehensive rules
  if (patterns.includes('time_condition') &&
      (patterns.includes('threshold_greater') || patterns.includes('threshold_less'))) {
    return Math.min(baseRate + 15, 95);
  }

  if (patterns.includes('data_source')) {
    return Math.min(baseRate + 10, 95);
  }

  return Math.max(baseRate, 40); // Minimum 40% coverage
}
