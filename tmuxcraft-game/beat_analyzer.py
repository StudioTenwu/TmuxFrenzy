#!/usr/bin/env python3
"""
Beat Detection Script for TMuxCraft Game
Analyzes an audio file and extracts beat timestamps for enemy spawning synchronization.
"""

import librosa
import numpy as np
import json
import sys

def analyze_beats(audio_file, output_file='public/beat_data.json'):
    """
    Analyze audio file and extract beat information.

    Args:
        audio_file: Path to the audio file (MP3, WAV, etc.)
        output_file: Path to save the JSON output
    """
    print(f"Loading audio file: {audio_file}")

    # Load audio file
    y, sr = librosa.load(audio_file)

    print(f"Sample rate: {sr} Hz")
    duration = len(y) / sr
    print(f"Duration: {duration:.2f} seconds")

    # Extract tempo and beat frames
    print("\nAnalyzing beats...")
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)

    tempo_float = float(tempo)
    print(f"Detected tempo: {tempo_float:.2f} BPM")
    print(f"Number of beats detected: {len(beat_frames)}")

    # Convert beat frames to time (in seconds)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    # Convert to milliseconds (for JavaScript)
    beat_times_ms = (beat_times * 1000).tolist()

    # Calculate inter-beat intervals
    if len(beat_times) > 1:
        intervals = np.diff(beat_times)
        avg_interval = np.mean(intervals)
        std_interval = np.std(intervals)
        print(f"Average beat interval: {avg_interval:.3f} seconds ({avg_interval*1000:.1f} ms)")
        print(f"Beat interval std dev: {std_interval:.3f} seconds")

    # Also get onset strength envelope for more detailed analysis
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)

    # Get downbeats (stronger beats, typically at bar boundaries)
    print("\nDetecting downbeats (bar boundaries)...")
    downbeat_frames = []

    # Use onset strength to identify stronger beats
    onset_at_beats = onset_env[beat_frames]
    # Find peaks in onset strength that are significantly higher
    threshold = np.percentile(onset_at_beats, 75)  # Top 25% of beats
    downbeat_indices = np.where(onset_at_beats > threshold)[0]
    downbeat_frames = beat_frames[downbeat_indices]
    downbeat_times_ms = (librosa.frames_to_time(downbeat_frames, sr=sr) * 1000).tolist()

    print(f"Number of downbeats detected: {len(downbeat_frames)}")

    # Create output data structure
    beat_data = {
        "tempo": tempo_float,
        "duration_seconds": duration,
        "sample_rate": int(sr),
        "beats": beat_times_ms,
        "downbeats": downbeat_times_ms,
        "beat_count": len(beat_times_ms),
        "average_beat_interval_ms": float(avg_interval * 1000) if len(beat_times) > 1 else None
    }

    # Save to JSON file
    print(f"\nSaving beat data to: {output_file}")
    with open(output_file, 'w') as f:
        json.dump(beat_data, f, indent=2)

    print("\n✓ Beat analysis complete!")
    print(f"  - {len(beat_times_ms)} beats detected")
    print(f"  - {len(downbeat_times_ms)} downbeats detected")
    print(f"  - Tempo: {tempo_float:.2f} BPM")
    print(f"  - Data saved to: {output_file}")

    # Print first few beats for verification
    print("\nFirst 10 beat timestamps (ms):")
    for i, beat_ms in enumerate(beat_times_ms[:10]):
        marker = " (downbeat)" if beat_ms in downbeat_times_ms else ""
        print(f"  Beat {i+1}: {beat_ms:.1f} ms{marker}")

    return beat_data

if __name__ == "__main__":
    if len(sys.argv) > 1:
        audio_file = sys.argv[1]
    else:
        audio_file = "public/background_music.mp3"

    output_file = "public/beat_data.json" if len(sys.argv) <= 2 else sys.argv[2]

    try:
        analyze_beats(audio_file, output_file)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)
