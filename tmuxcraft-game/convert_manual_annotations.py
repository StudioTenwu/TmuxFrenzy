#!/usr/bin/env python3
"""
Convert manual annotations CSV to beat_data.json format
"""

import csv
import json
import sys
import numpy as np

def convert_annotations(csv_file, output_file='public/beat_data.json'):
    """
    Convert manual annotations CSV to beat_data.json format.

    CSV format expected:
    TIME,LABEL
    2.803625000,101.1
    3.209354167,101.2
    ...

    Output JSON format:
    {
      "tempo": 120.5,
      "duration_seconds": 200.5,
      "beats": [2803.625, 3209.354, ...],
      "downbeats": [2803.625, 6566.896, ...],
      "beat_count": 414,
      "average_beat_interval_ms": 487.2
    }
    """

    print(f"Reading manual annotations from: {csv_file}")

    beats = []
    labels = []

    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            time_seconds = float(row['TIME'])
            label = row['LABEL']

            beats.append(time_seconds)
            labels.append(label)

    print(f"Loaded {len(beats)} annotations")

    # Convert beats to milliseconds
    beats_ms = [b * 1000 for b in beats]

    # Identify downbeats (first beat of each bar)
    # Labels like "101.1", "102.1", "103.1" are bar starts (X.1)
    downbeats_ms = []
    for i, label in enumerate(labels):
        # Check if label ends with .1 (first beat of bar)
        if label.endswith('.1'):
            downbeats_ms.append(beats_ms[i])

    print(f"Identified {len(downbeats_ms)} downbeats (bar starts)")

    # Calculate tempo (BPM)
    if len(beats) > 1:
        intervals = np.diff(beats)  # In seconds
        avg_interval = np.mean(intervals)
        tempo = 60.0 / avg_interval  # Convert to BPM
        avg_interval_ms = avg_interval * 1000
    else:
        tempo = 0
        avg_interval_ms = 0

    # Duration
    duration_seconds = max(beats) if beats else 0

    # Create output structure
    beat_data = {
        "tempo": float(tempo),
        "duration_seconds": float(duration_seconds),
        "sample_rate": 22050,  # Placeholder, not critical for manual annotations
        "beats": beats_ms,
        "downbeats": downbeats_ms,
        "beat_count": len(beats_ms),
        "average_beat_interval_ms": float(avg_interval_ms),
        "source": "manual_annotations"
    }

    # Save to JSON
    print(f"\nSaving beat data to: {output_file}")
    with open(output_file, 'w') as f:
        json.dump(beat_data, f, indent=2)

    print("\n✓ Conversion complete!")
    print(f"  - {len(beats_ms)} beats")
    print(f"  - {len(downbeats_ms)} downbeats")
    print(f"  - Tempo: {tempo:.2f} BPM")
    print(f"  - Duration: {duration_seconds:.2f} seconds")
    print(f"  - Avg interval: {avg_interval_ms:.1f} ms")

    # Print first few beats
    print("\nFirst 10 beats (ms):")
    for i in range(min(10, len(beats_ms))):
        marker = " (downbeat)" if beats_ms[i] in downbeats_ms else ""
        print(f"  Beat {i+1}: {beats_ms[i]:.1f} ms (label: {labels[i]}){marker}")

    # Print statistics
    if len(intervals) > 1:
        print(f"\nInterval statistics:")
        print(f"  - Min: {min(intervals)*1000:.1f} ms")
        print(f"  - Max: {max(intervals)*1000:.1f} ms")
        print(f"  - Std dev: {np.std(intervals)*1000:.1f} ms")

    return beat_data

if __name__ == "__main__":
    csv_file = sys.argv[1] if len(sys.argv) > 1 else "manual_annotations.csv"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "public/beat_data.json"

    try:
        convert_annotations(csv_file, output_file)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
