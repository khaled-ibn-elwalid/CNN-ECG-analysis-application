from fastapi import HTTPException, UploadFile
from pathlib import Path

#constants
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

#main validator

def validate_ecg_files(dat_file: UploadFile, hea_file :UploadFile) :
    #check if filename exists 
    if not dat_file.filename or not hea_file.filename:
        raise HTTPException(
            status_code=422,
            detail="Both files must have valid filenames."
        )
    
    #path lib for safe clean path parsing
    dat_path = Path(dat_file.filename)
    hea_path = Path(hea_file.filename)

    #check if file extensions are correct
    if dat_path.suffix.lower() != '.dat':
        raise HTTPException(
            status_code=422,
            detail="Invalid file type. Expected .dat file. Got :{dat_path.suffix} "
        )

    if hea_path.suffix.lower() != '.hea':
        raise HTTPException(
            status_code=422,
            detail="Invalid file type. Expected .hea file. Got :{hea_path.suffix} "
        )
    #check filename stems match
    if dat_path.stem != hea_path.stem:
        raise HTTPException(
            status_code=422,
            detail="Filename mismatch. The .dat and .hea files must have the same name (excluding extensions)."
        )

    #check the file size
    # cheking if empty file
    if dat_file.size == 0:
        raise HTTPException(
            status_code=422,
            detail="The .dat file is empty. Upload failed"
        )
    if hea_file.size == 0:
        raise HTTPException(
            status_code=422,
            detail="The .hea file is empty. Upload failed"
        )
    
    #checking maximum size limits
    if dat_file.size is not None and dat_file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=422,
            detail=f"The .dat file exceeds the maximum allowed size of 50 MB."
        )
    if hea_file.size is not None and hea_file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=422,
            detail=f"The .hea file exceeds the maximum allowed size of 50 MB."
        )
