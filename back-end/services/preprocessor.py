import tempfile
import numpy as np
import wfdb
import torch

from pathlib import Path
from fractions import Fraction
from scipy.signal import butter, filtfilt, iirnotch, resample_poly
from sklearn.preprocessing import StandardScaler
from fastapi import HTTPException
# Import patient service to verify the patient exists
from services.patient_service import get_patient_by_id


# =========================================================
# Constants
# =========================================================

ORIG_FS      = 500    # PTB-XL original sampling frequency
TARGET_FS    = 100    # resample target
WINDOW_SEC   = 10     # segment window length in seconds
NORM_METHOD  = "zscore"
CLIP_RANGE   = (-5, 5)

LEAD_NAMES = [
    "I", "II", "III",
    "aVR", "aVL", "aVF",
    "V1", "V2", "V3", "V4", "V5", "V6"
]


# =========================================================
# Filters — exact copies from training
# =========================================================

def bandpass_filter(signal, fs, lowcut=0.5, highcut=40.0, order=4):
    nyquist = fs / 2.0
    highcut = min(highcut, nyquist * 0.99)

    if lowcut <= 0 or lowcut >= highcut:
        raise ValueError(
            f"Invalid bandpass range for fs={fs}: lowcut={lowcut}, highcut={highcut}"
        )

    b, a = butter(order, [lowcut / nyquist, highcut / nyquist], btype="band")
    return filtfilt(b, a, signal, axis=0)


def notch_filter(signal, fs, freq=50.0, quality=30.0):
    nyquist = fs / 2.0

    # -----------------------------------------------
    # Bug 3 fix: skip notch if freq >= Nyquist
    # instead of crashing on 100Hz recordings
    # -----------------------------------------------
    if freq >= nyquist:
        return signal

    b, a = iirnotch(freq / nyquist, quality)
    return filtfilt(b, a, signal, axis=0)


def resample_signal(signal, orig_fs, target_fs=TARGET_FS):
    signal = signal.astype(np.float64, copy=False)

    if np.isclose(orig_fs, target_fs):
        return signal

    ratio = Fraction(float(target_fs) / float(orig_fs)).limit_denominator(1000)
    return resample_poly(signal, ratio.numerator, ratio.denominator, axis=0)


def normalize_window(signal):
    """
    Bug 4 fix: normalize per window not globally.
    Expects 2D signal of shape (n_samples, n_leads).
    """
    if signal.ndim != 2:
        raise ValueError(f"Expected 2D signal, got shape {signal.shape}")

    norm = StandardScaler().fit_transform(signal.astype(np.float64))
    norm = norm.astype(np.float32)
    norm = np.clip(norm, CLIP_RANGE[0], CLIP_RANGE[1])

    return norm


def segment_windows(signal, fs, window_sec=WINDOW_SEC):
    win = int(round(window_sec * fs))

    if win <= 0:
        raise ValueError(f"window_sec * fs must be positive, got {window_sec} * {fs}")

    n_windows = signal.shape[0] // win
    trimmed = signal[: n_windows * win]
    return trimmed.reshape(n_windows, win, signal.shape[1])


# =========================================================
# Main preprocessor
# =========================================================

def preprocess(dat_bytes: bytes, hea_bytes: bytes) -> dict:
    """
    Full preprocessing pipeline — exact same order as training.

    Steps:
        1.  Write bytes to temp files preserving original header stem
        2.  Read with wfdb
        3.  NaN / Inf sanitization
        4.  Bandpass filter
        5.  Notch filter (skipped if fs <= 100Hz)
        6.  Resample to 100Hz
        7.  Segment into windows
        8.  Validate at least one full window exists
        9.  Normalize per window (zscore + clip)
        10. Transpose → (n_leads, n_samples)
        11. Convert to tensor for model
        12. Build frontend signal
    """

    # -----------------------------------------------
    # 1. Write bytes to temp directory
    # Bug 1 fix: preserve the original stem from the
    # .hea file so the internal header reference
    # matches the filename on disk
    # -----------------------------------------------

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        # Extract the stem wfdb declared inside the .hea file
        # The first line of a .hea file is:
        # "<record_name> <n_leads> <fs> <n_samples>"
        hea_text  = hea_bytes.decode("utf-8", errors="replace")
        hea_stem  = hea_text.splitlines()[0].split()[0].strip()

        # Write both files using the stem declared in the header
        (tmp_path / f"{hea_stem}.dat").write_bytes(dat_bytes)
        (tmp_path / f"{hea_stem}.hea").write_bytes(hea_bytes)

        # -----------------------------------------------
        # 2. Read with wfdb
        # -----------------------------------------------

        try:
            record = wfdb.rdrecord(str(tmp_path / hea_stem))
        except Exception as e:
            raise ValueError(f"Could not read ECG record: {str(e)}")

    signal = record.p_signal
    fs     = record.fs

    # -----------------------------------------------
    # 3. NaN / Inf sanitization
    # -----------------------------------------------

    signal = np.nan_to_num(signal, nan=0.0, posinf=0.0, neginf=0.0)

    # -----------------------------------------------
    # 4. Bandpass filter
    # -----------------------------------------------

    signal = bandpass_filter(signal, fs)

    # -----------------------------------------------
    # 5. Notch filter
    # skipped automatically if fs <= 100Hz (Bug 3 fix)
    # -----------------------------------------------

    signal = notch_filter(signal, fs)

    # -----------------------------------------------
    # 6. Resample to 100Hz
    # -----------------------------------------------

    signal = resample_signal(signal, orig_fs=fs, target_fs=TARGET_FS)

    # -----------------------------------------------
    # 7. Segment into 10 second windows
    # shape after: (n_windows, 1000, 12)
    # -----------------------------------------------

    windows = segment_windows(signal, fs=TARGET_FS)

    # -----------------------------------------------
    # 8. Validate at least one full window exists
    # Bug 2 fix: reject recordings shorter than 10 sec
    # -----------------------------------------------

    if len(windows) == 0:
        min_seconds = WINDOW_SEC
        raise ValueError(f"ECG recording is too short. Minimum required is {min_seconds} seconds.")

    # Take the first window — shape: (1000, 12)
    window = windows[0]

    # -----------------------------------------------
    # 9. Normalize per window
    # Bug 4 fix: normalize after segmentation not before
    # shape stays: (1000, 12)
    # -----------------------------------------------

    window = normalize_window(window)

    # -----------------------------------------------
    # 10. Transpose → (n_leads, n_samples) = (12, 1000)
    # -----------------------------------------------

    window = window.T

    # -----------------------------------------------
    # 11. Convert to tensor → (1, 12, 1000)
    # -----------------------------------------------

    tensor = torch.tensor(window, dtype=torch.float32).unsqueeze(0)

    # -----------------------------------------------
    # 12. Build frontend signal as plain Python list
    # shape: (12, 1000) for Plotly
    # -----------------------------------------------

    frontend_signal = window.tolist()

    return {
        "tensor"     : tensor,
        "signal"     : frontend_signal,
        "lead_names" : LEAD_NAMES,
        "fs"         : TARGET_FS,
    }