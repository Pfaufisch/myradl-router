# MyRadl Router

A mobile web app that finds available MyRadl return stations near a destination and guides you there with a compass arrow.

## Development

```bash
npm install
npm run dev
```

Geolocation and the device compass require HTTPS in production. For local development, `localhost` is considered a secure context.

## Testing

```bash
npm test
npm run build
```

The app uses only public, CORS-enabled endpoints from nextbike (GBFS) and Photon. It has no backend and does not connect to a nextbike or MVGO account.
