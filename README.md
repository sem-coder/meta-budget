# Meta Budget Monitor

Een Next.js tool die elke ochtend om **09:00** automatisch de Meta (Facebook) advertentiebudgetten controleert en laat zien of er geld wordt uitgegeven.

## Functies

- ✅ **Dagelijkse cron** — automatische check elke dag om 09:00 via Vercel Cron Jobs
- 📊 **Live dashboard** — bekijk campagnebudgetten, uitgaven en budgetbenutting in één oogopslag
- 🔄 **Auto-refresh** — dashboard vernieuwt zichzelf elke 5 minuten
- ⚠️ **Status signalering** — direct zichtbaar of er actieve uitgaven zijn

## Installatie

### 1. Kloon het project

```bash
git clone https://github.com/sem-coder/meta-budget.git
cd meta-budget
npm install
```

### 2. Stel omgevingsvariabelen in

Kopieer `.env.example` naar `.env.local` en vul je gegevens in:

```bash
cp .env.example .env.local
```

| Variabele | Omschrijving |
|---|---|
| `META_ACCESS_TOKEN` | Long-lived access token van de Meta API |
| `META_AD_ACCOUNT_ID` | Je advertentie-account ID (bijv. `act_123456789`) |
| `CRON_SECRET` | Willekeurige beveiligingsstring voor het cron endpoint |

### 3. Meta API toegang instellen

1. Ga naar [developers.facebook.com](https://developers.facebook.com/apps/)
2. Maak een app aan of gebruik een bestaande
3. Voeg de **Marketing API** toe aan je app
4. Genereer een **long-lived access token** met de rechten:
   - `ads_read`
   - `ads_management`
5. Zoek je **Ad Account ID** op via de [Meta Business Manager](https://business.facebook.com/) → Instellingen → Advertentieaccounts

### 4. Start de ontwikkelserver

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

## Uitrollen op Vercel

1. Zet het project op Vercel via GitHub
2. Voeg de omgevingsvariabelen toe in Vercel → Settings → Environment Variables
3. De cron job (`vercel.json`) draait automatisch elke dag om 09:00 NL-tijd

### Cron configuratie (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 7 * * *"
    }
  ]
}
```

> `0 7 * * *` = 07:00 UTC = 09:00 Nederlandse tijd (UTC+2 in de zomer)

## API Endpoints

| Endpoint | Methode | Omschrijving |
|---|---|---|
| `/api/budget` | GET | Haal live budgetdata op |
| `/api/cron` | GET | Voer de dagelijkse check handmatig uit |

## Projectstructuur

```
meta-budget/
├── app/
│   ├── api/
│   │   ├── budget/route.ts   # Budget API endpoint
│   │   └── cron/route.ts     # Dagelijkse cron job
│   ├── layout.tsx
│   └── page.tsx              # Dashboard
├── lib/
│   └── meta-api.ts           # Meta Marketing API integratie
├── vercel.json               # Cron configuratie
└── .env.example              # Voorbeeld omgevingsvariabelen
```
