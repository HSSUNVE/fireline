# Stokes price tags

A mobile website for shelf tags. Open it in Safari and use Add to Home Screen. It is still a website: no App Store build and no native app.

The phone calls `POST /api/lookup` on this same site. That route asks Stokes for one product and returns the name, barcode (`sku`), 8-digit tag number (`upc_e`), regular price, and final price. The list shows both prices. The Excel file prints the regular price only.

## Run it on your computer

Install [Node.js 20 or newer](https://nodejs.org/), then in this folder:

```bash
npm install
npm start
```

Open http://localhost:8787

Typing a barcode or an 8-digit number works there. The camera also works in a browser on that computer, because `localhost` counts as a secure page. The iPhone cannot open your computer’s localhost. The phone camera needs the HTTPS site below.

`npm test` checks the two-line rules, the workbook fonts, and a live lookup of `10707621`, `10707620`, and `10707813`.

## Deploy the free HTTPS site later

Use Cloudflare Pages on the free plan. Do not add a credit card. A `pages.dev` address is already HTTPS, which is what Safari needs for the camera.

1. Push this repository to GitHub.
2. In the Cloudflare dashboard, open **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Choose this repository.
4. Build command: `npm run build`
5. Build output directory: `public`
6. Leave environment variables empty. Do not paste an Adobe key. The proxy is `functions/api/lookup.js`, and Pages serves it on the same hostname as the site.
7. Deploy. Open the `https://….pages.dev` link in Safari on the iPhone, allow the camera, then Share → **Add to Home Screen**.

The workbook he downloads is a filled copy of `template/petites-affiches.xlsx`. Line 1 and line 2 keep the fonts already in that file. More than 18 selected tags adds another sheet copied from that template.
