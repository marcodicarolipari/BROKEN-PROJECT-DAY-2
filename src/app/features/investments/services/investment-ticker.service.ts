import { Injectable, signal } from '@angular/core';

// ─── Domain types ──────────────────────────────────────────────────────────
export type TickerSymbol = 'ENI' | 'ISP' | 'UCG' | 'AAPL' | 'MSFT';

export interface TickerPrice {
  price: number;
  delta: number;
  ts:    number;
}

// ─── Seed prices ───────────────────────────────────────────────────────────
const INITIAL_PRICES: Record<TickerSymbol, number> = {
  ENI:   14.20,
  ISP:    3.45,
  UCG:    7.82,
  AAPL: 189.50,
  MSFT: 412.30,
};

const SYMBOLS: TickerSymbol[] = ['ENI', 'ISP', 'UCG', 'AAPL', 'MSFT'];

// ─── Portfolio holdings (quantità possedute per titolo) ────────────────────
const HOLDINGS: Record<TickerSymbol, number> = {
  ENI:  500,
  ISP: 1200,
  UCG:  300,
  AAPL:  40,
  MSFT:  25,
};

// ─── Service ───────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class InvestmentTickerService {

  private readonly _prices = signal<Record<TickerSymbol, TickerPrice>>(
    this._buildInitial(),
  );

  /** Public read-only signal consumed by components */
  readonly prices = this._prices.asReadonly();

  /** Prezzi iniziali e quantità possedute, usati per calcolare guadagno/perdita */
  readonly initialPrices: Readonly<Record<TickerSymbol, number>> = INITIAL_PRICES;
  readonly holdings: Readonly<Record<TickerSymbol, number>> = HOLDINGS;

  private _intervalId: ReturnType<typeof setInterval> | null = null;

  // ── Public API ────────────────────────────────────────────────────────

  connect(): void {
    if (this._intervalId !== null) return;
    this._intervalId = setInterval(() => this._startSimulation(), 1000);
  }

  disconnect(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private _buildInitial(): Record<TickerSymbol, TickerPrice> {
    const result = {} as Record<TickerSymbol, TickerPrice>;
    for (const sym of SYMBOLS) {
      result[sym] = { price: INITIAL_PRICES[sym], delta: 0, ts: Date.now() };
    }
    return result;
  }

  private _startSimulation(): void {
    this._prices.update(current => {
      const next = {} as Record<TickerSymbol, TickerPrice>;
      for (const symbol of SYMBOLS) {
        const prev      = current[symbol].price;
        const change    = (Math.random() - 0.5) * prev * 0.02;
        const nextPrice = parseFloat((prev + change).toFixed(2));
        const delta     = parseFloat((nextPrice - prev).toFixed(4));

        next[symbol] = { price: nextPrice, delta, ts: Date.now() };
      }
      return next;
    });
  }
}
