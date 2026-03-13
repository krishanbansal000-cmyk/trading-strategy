#!/usr/bin/env python3
import json
import math
import sys
from datetime import datetime


def zodiac_sign_for_month_rule(date_obj, commodity):
    month = date_obj.month
    day = date_obj.day

    if commodity == 'gold':
        bullish = ((month == 3 and day >= 20) or (month == 4 and day <= 19) or
                   (month == 8 and day >= 16) or (month == 9 and day <= 16))
        avoid = ((month == 10 and day >= 17) or (month == 11 and day <= 16))
        return 1 if bullish else (0 if avoid else 0)

    if commodity == 'copper':
        bullish = month == 4 and 1 <= day <= 25
        avoid = (month == 7 and day >= 10) or (month == 8 and day <= 4)
        return 1 if bullish else (0 if avoid else 0)

    if commodity == 'bitcoin':
        return 1 if date_obj.date() <= datetime(2026, 6, 30).date() else 0

    if commodity == 'silver':
        return 1 if date_obj.day in {5, 6, 7, 18, 19, 20, 29, 30} else 0

    return 0


def run_backtest(commodity, prices):
    active_days = 0
    strategy_return = 1.0
    buy_hold_return = 1.0
    wins = 0
    trades = 0

    for idx in range(len(prices) - 1):
        current = prices[idx]
        next_day = prices[idx + 1]
        if not current['close'] or not next_day['close']:
            continue

        date_obj = datetime.fromisoformat(current['date'])
        signal = zodiac_sign_for_month_rule(date_obj, commodity)
        daily_return = next_day['close'] / current['close']
        buy_hold_return *= daily_return

        if signal == 1:
            strategy_return *= daily_return
            active_days += 1
            trades += 1
            if next_day['close'] > current['close']:
                wins += 1

    strategy_pct = (strategy_return - 1.0) * 100
    buy_hold_pct = (buy_hold_return - 1.0) * 100
    win_rate = (wins / trades * 100) if trades else 0.0

    return {
        'commodity': commodity,
        'lookback_days': len(prices),
        'active_days': active_days,
        'trade_count': trades,
        'win_rate': round(win_rate, 2),
        'strategy_return_pct': round(strategy_pct, 2),
        'buy_hold_return_pct': round(buy_hold_pct, 2),
        'summary': (
            f"Rule-based astrology backtest for {commodity}: "
            f"{round(strategy_pct, 2)}% strategy return vs {round(buy_hold_pct, 2)}% buy-and-hold, "
            f"{round(win_rate, 2)}% win rate across {trades} active trade days."
        )
    }


def main():
    payload = json.loads(sys.stdin.read() or '{}')
    commodity = payload.get('commodity', 'gold')
    prices = payload.get('prices', [])
    print(json.dumps(run_backtest(commodity, prices)))


if __name__ == '__main__':
    main()
