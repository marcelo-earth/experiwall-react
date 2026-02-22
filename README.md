<p align="center">
  <img
    src=".github/experiwall.svg"
    align="center"
    width="100"
    alt="Experiwall React SDK"
    title="Experiwall React SDK"
  />
  <h1 align="center">Experiwall React SDK</h1>
</p>

<p align="center">
  <img
    src=".github/preview.png"
    align="center"
    alt="Experiwall React SDK"
    title="Experiwall React SDK"
  />
</p>

<p align="center">
  Code-first A/B testing for React. Define experiments inline, track conversions, and let the dashboard show you what wins.
</p>

---

## Install

```bash
npm install @experiwall/react
```

## Quick start

### 1. Wrap your app with the provider

```tsx
import { ExperiwallProvider } from "@experiwall/react";

export default function App() {
  return (
    <ExperiwallProvider
      apiKey="your-api-key"
      userId={currentUser.id}
      environment={process.env.NODE_ENV === "production" ? "production" : "development"}
    >
      <YourApp />
    </ExperiwallProvider>
  );
}
```

### 2. Run an experiment

```tsx
import { useExperiment } from "@experiwall/react";

function CheckoutButton() {
  const variant = useExperiment("checkout-flow", ["control", "new-checkout"]);

  if (variant === null) return null; // loading

  if (variant === "new-checkout") {
    return <NewCheckoutButton />;
  }

  return <OriginalCheckoutButton />;
}
```

That's it. The hook automatically:
- Assigns the user to a variant (deterministic, based on their seed)
- Tracks an `$exposure` event once per mount
- Registers the assignment with the server

### 3. Track conversions

```tsx
import { useTrack } from "@experiwall/react";

function PurchaseConfirmation({ amount }: { amount: number }) {
  const track = useTrack();

  useEffect(() => {
    track("purchase", { revenue: amount });
  }, []);

  return <p>Thanks for your order!</p>;
}
```

Events are batched (flushed every 30s) and automatically flushed when the user leaves the page.

## API

### `<ExperiwallProvider>`

| Prop | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | Yes | Your project API key |
| `userId` | `string` | No | Stable user identifier for consistent bucketing |
| `aliasId` | `string` | No | Alternative identifier (e.g. anonymous ID) |
| `environment` | `string` | No | `"production"` (default) or `"development"` — segments traffic in the dashboard |
| `overrides` | `Record<string, string>` | No | Force specific variants for QA (skips tracking) |
| `baseUrl` | `string` | No | Custom API URL (defaults to `https://experiwall.com`) |

### `useExperiment(flagKey, variants, options?)`

Returns the assigned variant (`string`) or `null` while loading.

```tsx
const variant = useExperiment("hero-banner", ["control", "large-cta", "video"]);
```

**Options:**

| Option | Type | Description |
|---|---|---|
| `force` | `string` | Override the variant for this hook only (skips tracking) |

### `useTrack()`

Returns a `track(eventName, properties?)` function.

```tsx
const track = useTrack();
track("signup", { plan: "pro" });
```

### `useExperiwall()`

Low-level access to the full SDK context.

| Field | Type | Description |
|---|---|---|
| `userSeed` | `number \| null` | Server-provided seed for deterministic bucketing. `null` while loading. |
| `assignments` | `Record<string, string>` | Map of flag key to assigned variant key |
| `experiments` | `Record<string, { variants: { key: string; weight: number }[] }> \| undefined` | Server-provided experiment definitions with variant weights |
| `overrides` | `Record<string, string>` | Provider-level forced variants |
| `isLoading` | `boolean` | `true` during the initial `/init` fetch |
| `error` | `Error \| null` | Error object if the `/init` fetch failed |
| `trackEvent` | `(event: ExperiwallEvent) => void` | Queue a raw event for batching |
| `registerLocalFlag` | `(flagKey, variants, assignedVariant) => void` | Register a client-side flag assignment with the server |

## QA and testing

Use `overrides` to force variants without contaminating experiment data:

```tsx
<ExperiwallProvider
  apiKey="your-api-key"
  userId={currentUser.id}
  overrides={{ "checkout-flow": "new-checkout" }}
>
```

Or per-hook:

```tsx
const variant = useExperiment("checkout-flow", ["control", "new-checkout"], {
  force: "new-checkout", etc.
});
```

Both skip exposure tracking and server registration entirely.

## Environment separation

Pass `environment` to keep development traffic out of your production results:

```tsx
<ExperiwallProvider
  apiKey="your-api-key"
  environment={process.env.NODE_ENV === "production" ? "production" : "development"}
>
```

The dashboard lets you toggle between Production and Development to view metrics separately.

## License

MIT
