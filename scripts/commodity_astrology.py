#!/usr/bin/env python3
import argparse
import json
from datetime import datetime, timezone

import swisseph as swe

SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

USER_NOTES = {
    'gold': 'User fit is strong because Sun and Moon are in Leo in the stored natal notes.',
    'silver': 'User fit is moderate via Jupiter wealth emphasis and lunar timing sensitivity.',
    'copper': 'User fit is cautious because Venus is debilitated in the stored natal notes.',
    'bitcoin': 'User fit favors bold trend-following but needs disciplined exits.'
}


def sign_name(longitude: float) -> str:
    return SIGNS[int(longitude // 30) % 12]


def julian_day(dt: datetime) -> float:
    return swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60 + dt.second / 3600)


def compute_positions(dt: datetime) -> dict:
    jd = julian_day(dt)
    positions = {}
    for name, planet_id in {
        'Sun': swe.SUN,
        'Moon': swe.MOON,
        'Venus': swe.VENUS,
        'Rahu': swe.MEAN_NODE
    }.items():
        result = swe.calc_ut(jd, planet_id)
        longitude = float(result[0][0])
        positions[name] = {
            'longitude': round(longitude, 2),
            'sign': sign_name(longitude)
        }
    return positions


def commodity_signal(commodity: str, positions: dict, dt: datetime) -> tuple[int, str]:
    sun_sign = positions['Sun']['sign']
    moon_sign = positions['Moon']['sign']
    venus_sign = positions['Venus']['sign']
    rahu_sign = positions['Rahu']['sign']
    phase = abs(((positions['Moon']['longitude'] - positions['Sun']['longitude']) + 360) % 360 - 180)

    if commodity == 'gold':
        if sun_sign in {'Aries', 'Leo'}:
            return 80, f'Sun is in {sun_sign}, matching the bullish gold rule.'
        if sun_sign == 'Libra':
            return 25, 'Sun is in Libra, which is the avoid zone for the gold rule.'
        return 55, f'Sun is in {sun_sign}; gold bias is neutral-to-hold.'

    if commodity == 'silver':
        if moon_sign == 'Taurus':
            return 78, 'Moon is in Taurus, a strong silver condition.'
        if moon_sign == 'Scorpio':
            return 20, 'Moon is in Scorpio, which is the weak silver condition.'
        if phase <= 12:
            return 68, 'Moon is close to full phase, adding silver momentum potential.'
        return 48, f'Moon is in {moon_sign}; silver setup is mixed.'

    if commodity == 'copper':
        if venus_sign in {'Taurus', 'Libra'} or (dt.month == 4 and 1 <= dt.day <= 25):
            return 76, 'Venus/copper timing is supportive now.'
        if venus_sign == 'Virgo' or (dt.month == 7 and 10 <= dt.day <= 31) or (dt.month == 8 and dt.day <= 4):
            return 22, 'Venus/copper timing is weak now.'
        return 46, f'Venus is in {venus_sign}; copper setup is cautionary.'

    if commodity == 'bitcoin':
        if rahu_sign == 'Aquarius' or dt.date() <= datetime(2026, 6, 30).date():
            return 82, 'Rahu/Bitcoin timing is supportive in the current regime.'
        return 44, f'Rahu is in {rahu_sign}; Bitcoin regime is no longer peak supportive.'

    return 50, 'No commodity-specific astrology rule applied.'


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--commodity', required=True)
    parser.add_argument('--date', default='')
    args = parser.parse_args()

    dt = datetime.fromisoformat(args.date) if args.date else datetime.now(timezone.utc).replace(tzinfo=None)
    positions = compute_positions(dt)
    score, rationale = commodity_signal(args.commodity, positions, dt)
    if score >= 70:
        action = 'favorable'
    elif score <= 30:
        action = 'avoid'
    else:
        action = 'mixed'

    summary = (
        f"{args.commodity.title()} astrology score: {score}/100 ({action}). "
        f"{rationale} {USER_NOTES.get(args.commodity, '')}"
    ).strip()

    print(json.dumps({
        'commodity': args.commodity,
        'date': dt.isoformat(),
        'positions': positions,
        'score': score,
        'action': action,
        'summary': summary
    }))


if __name__ == '__main__':
    main()
