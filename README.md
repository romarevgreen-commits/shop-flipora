# Flipora Netlify package

This is a deployable marketplace demonstration. Drag the entire folder into Netlify's manual deploy area.

## Included

- Responsive public marketplace
- Approved sample product
- Seller listing form
- Admin approval and rejection workflow
- Free Netlify-compatible static hosting

## Important production work

The demonstration stores listings only in the visitor's browser. Before taking real sellers or payments, connect a production database, authentication, image storage, and server-side Stripe Connect/Checkout endpoints. Never place a Stripe secret key in `app.js` or any browser-visible file.

## Deploy

1. In Netlify, choose **Add new project → Deploy manually**.
2. Upload the `flipora-netlify` folder or the provided ZIP file.
3. In **Domain management**, rename the generated `*.netlify.app` address.
