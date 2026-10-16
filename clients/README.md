# Client assets live here.

One folder per client, named after the config slug.

```
clients/
└── <slug>/
    ├── logo.png
    ├── products/
    │   ├── 1-1.jpg
    │   └── 2-1.jpg
    └── private/        # gitignored: contracts, invoices
```

`build-store.mjs` copies `clients/<slug>/` into `dist/<slug>/assets/` when it
exists. Product `images` paths in the config point here.

Keep images at 1000x1000 or larger, JPEG or PNG.
