import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiParsedRule {
  nodes: Array<{
    id: string;
    type: 'start' | 'process' | 'decision' | 'source' | 'outcome';
    label: string;
    explanation?: string;
  }>;
  connections: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
  mermaidCode: string;
  summary: string;
  coverageRate: number;
  detectedPatterns: string[];
  insights: string[];
  aiGenerated: boolean;
}

export class GeminiQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiQuotaError';
  }
}

export async function parseRulesWithGemini(
  question: string,
  description: string,
  resolutionSource?: string,
  markets?: Array<{question: string; outcomes: string[]}>
): Promise<GeminiParsedRule> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = buildPrompt(question, description, resolutionSource, markets);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Gemini response');
    }

    const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    // Generate Mermaid code from AI structure
    const mermaidCode = generateMermaidFromAIStructure(parsed);

    return {
      nodes: parsed.nodes || [],
      connections: parsed.connections || [],
      mermaidCode,
      summary: parsed.summary || 'AI-generated summary',
      coverageRate: parsed.coverageRate || 90,
      detectedPatterns: parsed.patterns || [],
      insights: parsed.insights || [],
      aiGenerated: true,
    };
  } catch (error: any) {
    // Check for quota errors
    if (error.message?.includes('quota') ||
        error.message?.includes('limit') ||
        error.message?.includes('429') ||
        error.status === 429) {
      throw new GeminiQuotaError('Gemini API免费额度已用完，请稍后再试或使用标准解析模式');
    }

    // Check for other API errors
    if (error.message?.includes('API key')) {
      throw new Error('Gemini API密钥配置错误');
    }

    throw new Error(`Gemini API错误: ${error.message}`);
  }
}

function buildPrompt(
  question: string,
  description: string,
  resolutionSource?: string,
  markets?: Array<{question: string; outcomes: string[]}>
): string {
  return `You are an expert at analyzing prediction market rules and creating flowcharts.

Analyze this Polymarket prediction market and create a detailed resolution flowchart structure.

**Market Question**: ${question}

**Full Description**:
${description}

${resolutionSource ? `**Resolution Source**: ${resolutionSource}` : ''}

${markets && markets.length > 0 ? `
**Available Outcome Options** (${markets.length} total):
${markets.slice(0, 10).map((m, i) => `${i + 1}. ${m.question}`).join('\n')}
${markets.length > 10 ? `... and ${markets.length - 10} more options` : ''}
` : ''}

**Your Task**:
1. Identify ALL resolution steps in chronological order
2. Extract ALL conditional logic and decision points
3. Identify data sources and verification methods
4. Map out the decision flow from start to final outcomes
5. Detect edge cases and fallback conditions

**Output Requirements**:
Return ONLY a valid JSON object (no markdown, no explanations outside JSON) with this exact structure:

{
  "nodes": [
    {
      "id": "A",
      "type": "start",
      "label": "Market Opens",
      "explanation": "Starting point"
    },
    {
      "id": "B",
      "type": "process",
      "label": "Wait for FOMC Meeting",
      "explanation": "Scheduled event"
    },
    {
      "id": "C",
      "type": "decision",
      "label": "Statement Released?",
      "explanation": "Check if official statement exists"
    },
    {
      "id": "D",
      "type": "source",
      "label": "Federal Reserve Official Website",
      "explanation": "Data source"
    },
    {
      "id": "E",
      "type": "outcome",
      "label": "50+ bps decrease",
      "explanation": "Final outcome option"
    }
  ],
  "connections": [
    {"from": "A", "to": "B"},
    {"from": "B", "to": "C"},
    {"from": "C", "to": "D", "label": "Yes"},
    {"from": "C", "to": "E", "label": "No / Fallback"}
  ],
  "summary": "This market resolves based on the Federal Reserve's interest rate decision...",
  "coverageRate": 95,
  "patterns": ["time_based", "threshold_check", "official_source", "fallback_condition"],
  "insights": [
    "The market has a clear fallback condition if no statement is released",
    "Rounding rules ensure outcomes map to predefined brackets"
  ]
}

**Important**:
- Use node IDs: A, B, C, D, E, F, G... (sequential letters)
- Types: "start", "process", "decision", "source", "outcome"
- Create enough nodes to capture the full resolution logic (typically 8-15 nodes)
- For Event markets with multiple outcomes, create separate outcome nodes
- Include data source nodes
- Map all conditional branches
- **CRITICAL**: Do NOT use special characters in labels: no brackets [], parentheses (), curly braces {}, or double quotes "
- Keep labels simple and descriptive, under 60 characters`;
}

function sanitizeMermaidLabel(label: string): string {
  // Remove or escape special characters that break Mermaid syntax
  return label
    .replace(/[{}]/g, '') // Remove curly braces
    .replace(/[\[\]]/g, '') // Remove square brackets
    .replace(/["]/g, "'") // Replace double quotes with single quotes
    .replace(/\(/g, ' ') // Replace parentheses with spaces
    .replace(/\)/g, ' ')
    .replace(/#/g, 'No.') // Replace # with No.
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
    .substring(0, 60); // Limit length
}

function generateMermaidFromAIStructure(parsed: any): string {
  let code = 'flowchart TD\n';

  // Add nodes
  parsed.nodes.forEach((node: any) => {
    const shape = getNodeShape(node.type);
    const label = sanitizeMermaidLabel(node.label);

    if (node.type === 'decision') {
      code += `    ${node.id}{${label}}\n`;
    } else if (node.type === 'start') {
      code += `    ${node.id}([${label}])\n`;
    } else if (node.type === 'source') {
      code += `    ${node.id}[["📊 ${label}"]]\n`;
    } else {
      code += `    ${node.id}[${label}]\n`;
    }
  });

  // Add connections
  parsed.connections.forEach((conn: any) => {
    if (conn.label) {
      const cleanLabel = sanitizeMermaidLabel(conn.label);
      code += `    ${conn.from} -->|${cleanLabel}| ${conn.to}\n`;
    } else {
      code += `    ${conn.from} --> ${conn.to}\n`;
    }
  });

  // Add styling
  parsed.nodes.forEach((node: any) => {
    const style = getNodeStyle(node.type);
    code += `    style ${node.id} ${style}\n`;
  });

  return code;
}

function getNodeShape(type: string): string {
  switch (type) {
    case 'start': return '([])';
    case 'decision': return '{}';
    case 'source': return '[[]]';
    default: return '[]';
  }
}

function getNodeStyle(type: string): string {
  switch (type) {
    case 'start': return 'fill:#e1f5ff,stroke:#01579b,stroke-width:3px';
    case 'process': return 'fill:#f3e5f5,stroke:#4a148c,stroke-width:2px';
    case 'decision': return 'fill:#e0f2f1,stroke:#004d40,stroke-width:2px';
    case 'source': return 'fill:#fff8e1,stroke:#f57f17,stroke-width:2px';
    case 'outcome': return 'fill:#c8e6c9,stroke:#1b5e20,stroke-width:3px';
    default: return 'fill:#f5f5f5,stroke:#616161,stroke-width:2px';
  }
}
