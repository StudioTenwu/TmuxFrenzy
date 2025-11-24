#!/usr/bin/env python3
"""
Validate beat_data.json format and timing
"""

import json
import sys

def validate_beat_data(json_file='public/beat_data.json'):
    print(f"Validating: {json_file}\n")

    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"✗ Failed to load JSON: {e}")
        return False

    # Check required fields
    required_fields = ['tempo', 'duration_seconds', 'beats', 'downbeats', 'beat_count']
    missing = [f for f in required_fields if f not in data]

    if missing:
        print(f"✗ Missing required fields: {missing}")
        return False

    print("✓ All required fields present")

    # Validate data types
    if not isinstance(data['beats'], list):
        print("✗ 'beats' must be an array")
        return False

    if not isinstance(data['downbeats'], list):
        print("✗ 'downbeats' must be an array")
        return False

    print("✓ Data types are correct")

    # Check beat count
    if len(data['beats']) != data['beat_count']:
        print(f"⚠ Warning: beat_count mismatch ({data['beat_count']} vs {len(data['beats'])})")

    # Validate beat values
    if len(data['beats']) == 0:
        print("✗ No beats found")
        return False

    # Check beats are in ascending order
    for i in range(len(data['beats']) - 1):
        if data['beats'][i] >= data['beats'][i+1]:
            print(f"✗ Beats not in ascending order at index {i}: {data['beats'][i]} >= {data['beats'][i+1]}")
            return False

    print("✓ Beats are in ascending order")

    # Check first beat timing
    first_beat = data['beats'][0]
    if first_beat < 0:
        print(f"✗ First beat is negative: {first_beat}")
        return False

    if first_beat > 10000:  # More than 10 seconds
        print(f"⚠ Warning: First beat is quite late: {first_beat:.1f}ms ({first_beat/1000:.1f}s)")

    # Check last beat doesn't exceed duration
    last_beat = data['beats'][-1]
    duration_ms = data['duration_seconds'] * 1000

    if last_beat > duration_ms:
        print(f"⚠ Warning: Last beat ({last_beat:.1f}ms) exceeds duration ({duration_ms:.1f}ms)")

    # Check downbeats are subset of beats
    beats_set = set(data['beats'])
    invalid_downbeats = [db for db in data['downbeats'] if db not in beats_set]
    if invalid_downbeats:
        print(f"⚠ Warning: {len(invalid_downbeats)} downbeats are not in beats array")

    print("✓ Downbeats are valid")

    # Summary
    print(f"\n{'='*50}")
    print("SUMMARY")
    print(f"{'='*50}")
    print(f"  Total beats: {len(data['beats'])}")
    print(f"  Downbeats: {len(data['downbeats'])}")
    print(f"  Tempo: {data['tempo']:.2f} BPM")
    print(f"  Duration: {data['duration_seconds']:.2f}s")
    print(f"  First beat: {first_beat:.1f}ms ({first_beat/1000:.2f}s)")
    print(f"  Last beat: {last_beat:.1f}ms ({last_beat/1000:.2f}s)")

    if 'average_beat_interval_ms' in data:
        print(f"  Avg interval: {data['average_beat_interval_ms']:.1f}ms")
        expected_bpm = 60000 / data['average_beat_interval_ms']
        print(f"  Expected BPM from interval: {expected_bpm:.2f}")

    # Show first few beats
    print(f"\n  First 5 beats:")
    for i in range(min(5, len(data['beats']))):
        beat_ms = data['beats'][i]
        is_downbeat = beat_ms in data['downbeats']
        marker = " [DOWNBEAT]" if is_downbeat else ""
        print(f"    {i+1}. {beat_ms:.1f}ms{marker}")

    # Show timing between first few beats
    print(f"\n  Intervals between first 5 beats:")
    for i in range(min(4, len(data['beats']) - 1)):
        interval = data['beats'][i+1] - data['beats'][i]
        print(f"    Beat {i+1} → {i+2}: {interval:.1f}ms")

    print(f"\n✓ Validation passed!")
    return True

if __name__ == "__main__":
    json_file = sys.argv[1] if len(sys.argv) > 1 else "public/beat_data.json"
    success = validate_beat_data(json_file)
    sys.exit(0 if success else 1)
