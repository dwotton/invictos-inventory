# Invictos clinic app

Clinics log each implant as it's used in surgery, queue the replacement, and submit reorders to Invictos NetSuite for approval. They can then track each order through to delivery.

- **App** (`src/`): React + TypeScript, built with Vite.
- **Server** (`server/`): Node + Express. It handles clinic sign-in and is the only part that talks to NetSuite. NetSuite keys never reach the app.
- **Shelf counts** (on hand, par, location) and clinic logins are kept by the server in `data/store.json`. Items, orders, shipments and tracking come from NetSuite.

## Run it on your computer

You need Node.js 22 (LTS) from https://nodejs.org.

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173. Leave the terminal open while you use the app; press Control + C to stop it.

With the `.env` as copied, the app uses **built-in sample data**. To try it, add the sample clinic (customer 1001) in a second terminal window:

```bash
npm run admin -- add-clinic --name "Riverbend Veterinary Surgery" --customer 1001
npm run admin -- import-items --name "Riverbend Veterinary Surgery"
```

The first command prints a setup code. In the app, choose **Use a setup code**, enter the clinic name and code, and pick a password.

## See real NetSuite data

1. Your NetSuite admin creates an integration record (token-based authentication) and an access token for a role that can **view** items, customers, sales orders and item fulfillments and **create** sales orders.
2. Put the keys in `.env` on your computer only. Never email them, paste them into chat, or commit them.

   ```
   NETSUITE_MODE=live
   NETSUITE_ACCOUNT_ID=9801115_SB1      # sandbox; the live account is 9801115
   NETSUITE_CONSUMER_KEY=...
   NETSUITE_CONSUMER_SECRET=...
   NETSUITE_TOKEN_ID=...
   NETSUITE_TOKEN_SECRET=...
   NETSUITE_ORDERS=off
   ```

3. Restart `npm run dev`. The server's first lines say which account it's connected to and whether ordering is on.
4. Add a clinic using its real NetSuite customer internal id, then load the items it ordered in the last year:

   ```bash
   npm run admin -- add-clinic --name "Clinic Name" --customer 511
   npm run admin -- import-items --name "Clinic Name"
   ```

`NETSUITE_ORDERS=off` (the default) lets you view real data without any risk: the Submit button is disabled. Use `on` to allow orders on a **sandbox** account. `on-production` is required before the app can create orders on the live account.

App orders are saved in NetSuite as **Pending Approval** with "Clinic app" in the PO # field. Terms, price level and ship-to come from the customer record.

## Admin commands

Run `npm run admin` for the full list.

| Command | What it does |
| --- | --- |
| `list` | Clinics and whether they've finished setup |
| `add-clinic --name … --customer …` | Add a clinic and print its one-time setup code |
| `new-code --name …` | Print a new setup code (forgotten password) |
| `import-items --name …` | Add items the clinic ordered in the last 12 months |
| `add-item` / `set-stock --name … --item 002716 [--par] [--on-hand] [--loc]` | Add or adjust a shelf line |
| `remove-item`, `remove-clinic` | Remove a shelf line or a clinic |

**Nothing is emailed.** Setup codes appear only in the terminal. Each code works once and expires after 14 days.

## Not built yet

- Barcode scanning. Staff pick the implant from a list for now.
- Logging use to the patient's case in ezyVet. The case reference is stored by the app only.
- Hosting for clinics to use it. It runs on one computer for now.
