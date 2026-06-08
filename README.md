# EnergyOps — Demo Dashboard

> **DEMO / DUMMY DATA NOTICE**  
> This application is a functional prototype. All energy consumption figures, forecasts, unit costs, and financial summaries shown in the dashboard are **dummy (synthetic) data** used for demonstration and UI validation purposes. They do **not** reflect real plant operations.

## Scope

- **Plants**: Motores Norte & Fundiciones
- **Energies tracked**: Electricity (MWHr), NG (MWHr), Water (M³)
- **Forecast horizon**: 1 month ahead (monthly linear-regression models)
- **Language**: English UI

## Brand Palette

| Name            | Hex       |
|-----------------|-----------|
| Deep Marine     | `#194390` |
| Danube          | `#5C93CC` |
| Full White      | `#FFFFFF` |
| Young Blue      | `#86C1E2` |
| Mary            | `#1F3F97` |
| Digital Navy    | `#000082` |

## Tech Stack

- TanStack Start (React 19 + Vite)
- Tailwind CSS v4
- Recharts
- Lovable Cloud (Supabase backend)

## Data Dictionary (Overview)

| Symbol | Meaning                            |
|--------|------------------------------------|
| ŷ      | Forecasted consumption             |
| t      | Time index (month number)          |
| a      | Regression intercept               |
| b      | Regression slope                   |
| n      | Number of historical observations  |

---

*Generated for demo purposes.*
