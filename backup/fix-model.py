import torch
import pathlib

# Fix PosixPath for Windows
pathlib.PosixPath = pathlib.WindowsPath

# Load and save model ulang
model = torch.load('models/nayol.pt', map_location='cpu')
torch.save(model, 'models/nayol_fixed.pt')
