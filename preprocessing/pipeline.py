import ast
import os
import warnings
from fractions import Fraction

import numpy as np
import pandas as pd
import wfdb
from scipy.signal import butter, filtfilt, iirnotch, resample_poly
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler, RobustScaler, StandardScaler

try:
    from tqdm import tqdm
except ImportError:  # pragma: no cover - convenience fallback for minimal envs
    tqdm = None


CLASSES = ["NORM", "MI", "STTC", "CD", "HYP"]

# Used only when ptb_path/scp_statements.csv is absent. Prefer the CSV metadata
# file whenever possible because it is the authoritative PTB-XL label source.
BUILTIN_SCP_SUPERCLASS_MAP = {
    # NORM
    "NORM": "NORM",
    "SR":   "NORM",   # sinus rhythm — normal baseline

    # MI
    "AMI":   "MI", "ALMI":  "MI", "ASMI":  "MI", "ILMI":  "MI",
    "IMI":   "MI", "IPLMI": "MI", "IPMI":  "MI", "LMI":   "MI",
    "PMI":   "MI", "INJAL": "MI", "INJAS": "MI", "INJIL": "MI",
    "INJIN": "MI", "INJLA": "MI", "QWAVE": "MI", "STE_":  "MI",

    # STTC
    "DIG":   "STTC", "ISC_":  "STTC", "ISCAL": "STTC", "ISCAN": "STTC",
    "ISCAS": "STTC", "ISCIL": "STTC", "ISCIN": "STTC", "ISCLA": "STTC",
    "ANEUR": "STTC", "EL":    "STTC", "LNGQT": "STTC", "NDT":   "STTC",
    "NST_":  "STTC", "INVT":  "STTC", "LOWT":  "STTC", "NT_":   "STTC",
    "STD_":  "STTC", "TAB_":  "STTC",

    # CD
    "1AVB":   "CD", "2AVB":   "CD", "3AVB":   "CD",
    "CLBBB":  "CD", "CRBBB":  "CD", "ILBBB":  "CD", "IRBBB":  "CD",
    "IVCD":   "CD", "LAFB":   "CD", "LPFB":   "CD", "WPW":    "CD",
    "ABQRS":  "CD", "AFIB":   "CD", "AFLT":   "CD", "BIGU":   "CD",
    "LPR":    "CD", "PAC":    "CD", "PACE":   "CD", "PRC(S)": "CD",
    "PSVT":   "CD", "PVC":    "CD", "SARRH":  "CD", "SBRAD":  "CD",
    "STACH":  "CD", "SVARR":  "CD", "SVTAC":  "CD", "TRIGU":  "CD",

    # HYP
    "LAO/LAE": "HYP", "LVH":   "HYP", "RAO/RAE": "HYP",
    "RVH":     "HYP", "SEHYP": "HYP", "HVOLT":   "HYP",
    "LVOLT":   "HYP", "VCLVH": "HYP",
}


SCALERS = {
    "zscore": StandardScaler,
    "minmax": MinMaxScaler,
    "robust": RobustScaler,
}


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
    if freq >= fs / 2.0:
        raise ValueError("Notch frequency must be below Nyquist")

    b, a = iirnotch(freq / (fs / 2.0), quality)
    return filtfilt(b, a, signal, axis=0)


def resample_signal(signal, orig_fs, target_fs=100):
    signal = signal.astype(np.float64, copy=False)
    if np.isclose(orig_fs, target_fs):
        return signal

    ratio = Fraction(float(target_fs) / float(orig_fs)).limit_denominator(1000)
    return resample_poly(signal, ratio.numerator, ratio.denominator, axis=0)


def normalize(signal, method="zscore", clip=None):
    if signal.ndim != 2:
        raise ValueError(f"Expected 2D signal, got {signal.shape}")
    if method not in SCALERS:
        raise ValueError(f"Unknown normalization method: {method}")

    norm = SCALERS[method]().fit_transform(signal.astype(np.float64))
    norm = norm.astype(np.float32)

    if clip is not None:
        if len(clip) != 2 or clip[0] >= clip[1]:
            raise ValueError(f"clip must be (low, high), got {clip}")
        norm = np.clip(norm, clip[0], clip[1])

    return norm


def segment_windows(signal, fs, window_sec=10):
    """Return non-overlapping fixed windows and drop the last incomplete one."""
    win = int(round(window_sec * fs))
    if win <= 0:
        raise ValueError(f"window_sec * fs must be positive, got {window_sec} * {fs}")

    n_windows = signal.shape[0] // win
    trimmed = signal[: n_windows * win]
    return trimmed.reshape(n_windows, win, signal.shape[1])


def load_scp_superclass_map(ptb_path, classes=CLASSES, allow_builtin_fallback=True):
    """
    Load PTB-XL SCP-code to diagnostic-superclass mapping.

    Expected authoritative file:
        ptb_path/scp_statements.csv

    Your current folder does not include this file, so the built-in fallback is
    used unless you add scp_statements.csv beside ptbxl_database.csv.
    """
    scp_path = os.path.join(ptb_path, "scp_statements.csv")

    if os.path.exists(scp_path):
        scp = pd.read_csv(scp_path, index_col=0)
        if "diagnostic_class" not in scp.columns:
            raise ValueError("scp_statements.csv is missing 'diagnostic_class'")

        if "diagnostic" in scp.columns:
            scp = scp[scp["diagnostic"].astype(bool)]

        scp = scp.dropna(subset=["diagnostic_class"])
        class_set = set(classes)
        return {
            str(code): str(row["diagnostic_class"])
            for code, row in scp.iterrows()
            if str(row["diagnostic_class"]) in class_set
        }

    if not allow_builtin_fallback:
        raise FileNotFoundError(f"Missing PTB-XL label metadata: {scp_path}")

    warnings.warn(
        "scp_statements.csv not found. Using built-in PTB-XL superclass mapping. "
        "For publication-quality experiments, add scp_statements.csv to ptb_path.",
        RuntimeWarning,
    )
    return dict(BUILTIN_SCP_SUPERCLASS_MAP)


def scp_to_multihot(scp_str, scp_superclass_map, classes=CLASSES, threshold=0.0):
    """
    Convert PTB-XL scp_codes into a multi-hot vector over:
        NORM, MI, STTC, CD, HYP
    """
    try:
        scp_dict = ast.literal_eval(str(scp_str))
    except (ValueError, SyntaxError):
        return np.zeros(len(classes), dtype=np.float32)

    y = np.zeros(len(classes), dtype=np.float32)
    class_to_index = {class_name: i for i, class_name in enumerate(classes)}

    for code, likelihood in scp_dict.items():
        try:
            likelihood = float(likelihood)
        except (TypeError, ValueError):
            continue
        if likelihood <= threshold:
            continue

        superclass = code if code in class_to_index else scp_superclass_map.get(code)
        if superclass in class_to_index:
            y[class_to_index[superclass]] = 1.0

    return y


def expand_labels_per_segment(record_labels, n_segments):
    if record_labels.ndim != 1:
        raise ValueError(
            f"record_labels must be 1D (K,), got {record_labels.shape}. "
            "Pass one record's label vector at a time."
        )
    return np.repeat(record_labels[np.newaxis, :], n_segments, axis=0)


def preprocess_record(
    record_path,
    target_fs=100,
    window_sec=10,
    norm_method="zscore",
    clip_range=(-5, 5),
    notch_freq=50.0,
):
    try:
        record = wfdb.rdrecord(record_path)
        signal = record.p_signal
        fs = record.fs

        if signal is None or np.all(np.isnan(signal)):
            return None

        if signal.ndim != 2 or signal.shape[1] != 12:
            n_leads = None if signal.ndim != 2 else signal.shape[1]
            warnings.warn(f"Skipping {record_path}: expected 12 leads, got {n_leads}")
            return None

        if np.any(np.isnan(signal)):
            signal = (
                pd.DataFrame(signal)
                .interpolate(method="linear", limit_direction="both")
                .values
            )

        signal = bandpass_filter(signal, fs)

        if notch_freq is not None and notch_freq < fs / 2.0:
            signal = notch_filter(signal, fs, freq=notch_freq)

        signal = resample_signal(signal, fs, target_fs)
        signal = normalize(signal, method=norm_method, clip=clip_range)
        return segment_windows(signal, target_fs, window_sec)

    except Exception as exc:
        warnings.warn(f"Failed: {record_path} - {exc}")
        return None


def build_dataset(
    ptb_path,
    target_fs=100,
    window_sec=10,
    norm_method="zscore",
    clip_range=(-5, 5),
    record_column="filename_lr",
    label_threshold=0.0,
):
    csv_path = os.path.join(ptb_path, "ptbxl_database.csv")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"ptbxl_database.csv not found in: {ptb_path}")

    df = pd.read_csv(csv_path)
    required_columns = {record_column, "scp_codes", "strat_fold"}
    missing = sorted(required_columns.difference(df.columns))
    if missing:
        raise ValueError(f"ptbxl_database.csv missing columns: {missing}")

    scp_superclass_map = load_scp_superclass_map(ptb_path)

    X_all, y_all, fold_all = [], [], []
    skipped = 0
    iterator = df.iterrows()
    if tqdm is not None:
        iterator = tqdm(iterator, total=len(df), desc="Loading records")

    for _, row in iterator:
        record_path = os.path.join(ptb_path, str(row[record_column]))
        if not os.path.exists(record_path + ".dat") or not os.path.exists(
            record_path + ".hea"
        ):
            warnings.warn(f"Missing .dat or .hea for: {record_path}")
            skipped += 1
            continue

        label_vec = scp_to_multihot(
            row["scp_codes"],
            scp_superclass_map=scp_superclass_map,
            threshold=label_threshold,
        )
        if label_vec.sum() == 0:
            skipped += 1
            continue

        segs = preprocess_record(
            record_path=record_path,
            target_fs=target_fs,
            window_sec=window_sec,
            norm_method=norm_method,
            clip_range=clip_range,
        )
        if segs is None or len(segs) == 0:
            skipped += 1
            continue

        n_segments = len(segs)
        X_all.append(segs)
        y_all.append(expand_labels_per_segment(label_vec, n_segments))
        fold_all.extend([row["strat_fold"]] * n_segments)

    if not X_all:
        raise RuntimeError(
            "No records were loaded. Check ptb_path, record_column, files, and labels."
        )

    X = np.concatenate(X_all, axis=0).astype(np.float32)
    y = np.concatenate(y_all, axis=0).astype(np.float32)
    folds = np.asarray(fold_all, dtype=np.int64)

    print(f"\nDone - total records: {len(df)} | skipped: {skipped}")
    print(f"X shape  : {X.shape}")
    print(f"y shape  : {y.shape}")
    for i, class_name in enumerate(CLASSES):
        print(f"  {class_name:6s}: {int(y[:, i].sum())} positive segments")

    return X, y, folds


def split_by_official_folds(X, y, folds):
    train_mask = folds <= 8
    val_mask = folds == 9
    test_mask = folds == 10

    return {
        "train": (X[train_mask], y[train_mask]),
        "val": (X[val_mask], y[val_mask]),
        "test": (X[test_mask], y[test_mask]),
    }


def build_record_table(df, ptb_path, classes=CLASSES, threshold=0.0):
    required_columns = {"ecg_id", "patient_id", "strat_fold", "scp_codes"}
    missing = sorted(required_columns.difference(df.columns))
    if missing:
        raise ValueError(f"ptbxl_database.csv missing columns: {missing}")

    scp_superclass_map = load_scp_superclass_map(ptb_path)
    labels = np.stack(
        [
            scp_to_multihot(scp, scp_superclass_map, classes, threshold)
            for scp in df["scp_codes"]
        ]
    )

    table = pd.DataFrame(
        {
            "record_id": df["ecg_id"],
            "patient_id": df["patient_id"],
            "strat_fold": df["strat_fold"],
        }
    )

    valid = labels.sum(axis=1) > 0
    n_drop = int((~valid).sum())
    if n_drop > 0:
        warnings.warn(f"{n_drop} records had no matching class and were dropped.")

    table = table[valid].reset_index(drop=True)
    labels = labels[valid]

    print(f"Records loaded : {len(table)}")
    print(
        f"Class counts   : "
        f"{ {class_name: int(labels[:, i].sum()) for i, class_name in enumerate(classes)} }"
    )

    return table, labels


def patient_wise_split(
    table,
    labels,
    use_official_folds=True,
    test_size=0.2,
    val_size=0.1,
    seed=42,
):
    if use_official_folds:
        train_mask = table["strat_fold"].isin(range(1, 9))
        val_mask = table["strat_fold"] == 9
        test_mask = table["strat_fold"] == 10
    else:
        patients = table["patient_id"].unique()
        train_pat, test_pat = train_test_split(
            patients, test_size=test_size, random_state=seed
        )
        adjusted_val = val_size / (1.0 - test_size)
        train_pat, val_pat = train_test_split(
            train_pat, test_size=adjusted_val, random_state=seed
        )
        train_mask = table["patient_id"].isin(train_pat)
        val_mask = table["patient_id"].isin(val_pat)
        test_mask = table["patient_id"].isin(test_pat)

    splits = {
        "train": (table[train_mask].reset_index(drop=True), labels[train_mask.values]),
        "val": (table[val_mask].reset_index(drop=True), labels[val_mask.values]),
        "test": (table[test_mask].reset_index(drop=True), labels[test_mask.values]),
    }

    for name, (split_table, _) in splits.items():
        n_patients = len(split_table["patient_id"].unique())
        print(f"{name:5s}: {len(split_table):5d} records | {n_patients:5d} patients")

    return splits


def filter_unlabeled(labels, table):
    valid = labels.sum(axis=1) > 0
    n_dropped = int((~valid).sum())
    if n_dropped > 0:
        warnings.warn(f"{n_dropped} records had no matching class - dropped.")
    return table[valid].reset_index(drop=True), labels[valid]


if __name__ == "__main__":
    ptb_path = r"C:\Users\khaled\Desktop\Master\ptb"
    X, y, folds = build_dataset(ptb_path, record_column="filename_lr")
    splits = split_by_official_folds(X, y, folds)
    print(
        "Split shapes:",
        splits["train"][0].shape,
        splits["val"][0].shape,
        splits["test"][0].shape,
    )
