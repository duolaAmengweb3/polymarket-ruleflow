import { NextRequest, NextResponse } from 'next/server';

export interface PolymarketMarket {
  question: string;
  description: string;
  outcomes: string[];
  outcomePrices: string[];
  endDate: string;
  resolutionSource?: string;
  category?: string;
  volume?: string;
  liquidity?: string;
  isEvent?: boolean;
  markets?: Array<{
    question: string;
    outcomes: string[];
    outcomePrices: string[];
  }>;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json(
      { error: 'Market slug is required' },
      { status: 400 }
    );
  }

  try {
    // First, try to fetch as an Event (multi-outcome market)
    const eventResponse = await fetch(
      `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(slug)}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 300 }
      }
    );

    if (eventResponse.ok) {
      const eventData = await eventResponse.json();

      if (Array.isArray(eventData) && eventData.length > 0) {
        const event = eventData[0];

        // Extract markets from the event
        const markets = event.markets?.map((m: any) => {
          let outcomes: string[] = [];
          let outcomePrices: string[] = [];

          try {
            outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : (m.outcomes || []);
            outcomePrices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : (m.outcomePrices || []);
          } catch (e) {
            console.error('Error parsing market outcomes:', e);
          }

          return {
            question: m.question || '',
            outcomes,
            outcomePrices,
          };
        }) || [];

        const marketData: PolymarketMarket = {
          question: event.title || '',
          description: event.description || '',
          outcomes: markets.map((m: any) => m.question),
          outcomePrices: markets.map((m: any) => m.outcomePrices[0] || '0'),
          endDate: event.endDate || event.endDateIso || '',
          resolutionSource: event.resolutionSource || '',
          category: event.category || '',
          volume: event.volume?.toString() || '',
          liquidity: event.liquidity?.toString() || '',
          isEvent: true,
          markets,
        };

        return NextResponse.json(marketData);
      }
    }

    // If not an event, try as a single Market
    const marketResponse = await fetch(
      `https://gamma-api.polymarket.com/markets?slug=${encodeURIComponent(slug)}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 300 }
      }
    );

    if (!marketResponse.ok) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    const marketData = await marketResponse.json();

    if (!Array.isArray(marketData) || marketData.length === 0) {
      return NextResponse.json(
        { error: 'Market not found with this slug' },
        { status: 404 }
      );
    }

    const market = marketData[0];

    // Parse outcomes and prices (they come as JSON strings)
    let outcomes: string[] = [];
    let outcomePrices: string[] = [];

    try {
      outcomes = typeof market.outcomes === 'string'
        ? JSON.parse(market.outcomes)
        : (market.outcomes || []);
      outcomePrices = typeof market.outcomePrices === 'string'
        ? JSON.parse(market.outcomePrices)
        : (market.outcomePrices || []);
    } catch (e) {
      console.error('Error parsing outcomes:', e);
    }

    const result: PolymarketMarket = {
      question: market.question || '',
      description: market.description || '',
      outcomes,
      outcomePrices,
      endDate: market.endDate || market.endDateIso || '',
      resolutionSource: market.resolutionSource || '',
      category: market.category || '',
      volume: market.volume || market.volumeNum?.toString() || '',
      liquidity: market.liquidity || market.liquidityNum?.toString() || '',
      isEvent: false,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data. Please check the slug and try again.' },
      { status: 500 }
    );
  }
}
