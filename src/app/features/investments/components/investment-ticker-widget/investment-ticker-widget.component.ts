import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import {
  InvestmentTickerService,
  TickerSymbol,
} from '../../services/investment-ticker.service';

// ─── View model ─────────────────────────────────────────────────────────────
export interface TickerRow {
  symbol: TickerSymbol;
  price:  number;
  delta:  number;
  ts:     number;
}

export interface PortfolioMover {
  symbol:        TickerSymbol;
  changePercent: number;
}

export interface PortfolioSummary {
  totalValue:    number;
  gainersCount:  number;
  losersCount:   number;
  topMover:      PortfolioMover | null;
}

// ─── Component ──────────────────────────────────────────────────────────────
@Component({
  selector: 'app-investment-ticker-widget',
  standalone: true,
  imports: [DecimalPipe, DatePipe],
  templateUrl: './investment-ticker-widget.component.html',
  styleUrl:    './investment-ticker-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestmentTickerWidgetComponent implements OnDestroy {

  private readonly _ticker = inject(InvestmentTickerService);

  // ── Signals ────────────────────────────────────────────────────────────
  readonly filter = signal<string>('');
  readonly sortBy = signal<'symbol' | 'price' | 'delta'>('symbol');

  // ── Computed ───────────────────────────────────────────────────────────
  readonly viewModel = computed<TickerRow[]>(() => {
    const f = this.filter();
    const filterText = (typeof f === 'string' ? f : '').trim().toUpperCase();

    const sortKey = this.sortBy();
    const prices  = this._ticker.prices();

    const rows: TickerRow[] = (Object.keys(prices) as TickerSymbol[])
      .map(sym => ({ symbol: sym, ...prices[sym] }))
      .filter(r => r.symbol.includes(filterText));

    return rows.sort((a, b) => {
      if (sortKey === 'symbol') return a.symbol.localeCompare(b.symbol);
      if (sortKey === 'price')  return b.price - a.price;
      return b.delta - a.delta;
    });
  });

  /** Riepilogo calcolato sui titoli visibili nella tabella */
  readonly portfolioSummary = computed<PortfolioSummary>(() => {
    const rows = this.viewModel();
    const initialPrices = this._ticker.initialPrices;
    const holdings = this._ticker.holdings;

    let totalValue = 0;
    let gainersCount = 0;
    let losersCount = 0;
    let topMover: PortfolioMover | null = null;

    for (const row of rows) {
      const { symbol, price: current } = row;
      const initial = initialPrices[symbol];
      const quantity = holdings[symbol];

      totalValue += current * quantity;

      if (current > initial) gainersCount++;
      else if (current < initial) losersCount++;

      const changePercent = ((current - initial) / initial) * 100;
      if (!topMover || Math.abs(changePercent) > Math.abs(topMover.changePercent)) {
        topMover = { symbol, changePercent };
      }
    }

    return { totalValue, gainersCount, losersCount, topMover };
  });

  // ── Effects ────────────────────────────────────────────────────────────
  /** Effect: connette il servizio e lo disconnette al destroy */
  private readonly _connectEffect = effect((onCleanup) => {
    this._ticker.connect();
    onCleanup(() => this._ticker.disconnect());
  });
  ngOnDestroy(): void {
    this._ticker.disconnect();
  }

  // ── Public methods (usati dal template) ────────────────────────────────
  setFilter(value: string): void {
    this.filter.set(value.toUpperCase());
  }

  setSortBy(key: 'symbol' | 'price' | 'delta'): void {
    this.sortBy.set(key);
  }
}
