# Dataset

This folder is excluded from git (87,000 images, ~1 GB).

## Download

1. Go to: https://www.kaggle.com/datasets/grassknoted/asl-alphabet
2. Download and unzip `archive.zip`
3. Place the contents here:

```
backend/dataset/
├── train/
│   ├── A/      ← 3,000 images
│   ├── B/      ← 3,000 images
│   ├── ...
│   └── Z/
└── test/
    ├── A_test.jpg
    ├── B_test.jpg
    └── ...
```

## Stats

| Split | Classes | Images |
|---|---|---|
| Train | 29 | 87,000 |
| Test  | 29 | 28     |

Classes: `A–Z` + `space` + `del` + `nothing`
