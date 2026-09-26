# Compare two screenshot folders pixel by pixel.
import sys, os
import numpy as np
from PIL import Image
a, b = sys.argv[1], sys.argv[2]
total = diffn = 0
for f in sorted(os.listdir(a)):
    if not f.endswith('.png'): continue
    x = np.asarray(Image.open(os.path.join(a, f)).convert('RGBA'), dtype=np.int16)
    y = np.asarray(Image.open(os.path.join(b, f)).convert('RGBA'), dtype=np.int16)
    total += 1
    if x.shape != y.shape:
        print('SHAPE', f, x.shape, y.shape); diffn += 1; continue
    d = np.abs(x - y).max(axis=2)
    n = int((d > 0).sum())
    if n:
        diffn += 1
        ys, xs = np.nonzero(d)
        print(f'{f}: {n} px differ, max {int(d.max())}, x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()}')
print(f'{total} images, {diffn} differ')
