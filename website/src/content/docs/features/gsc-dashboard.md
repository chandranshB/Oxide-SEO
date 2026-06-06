---
title: GSC Dashboard
description: Learn how to connect and use the GSC Dashboard in Oxide-SEO.
---

The GSC Dashboard allows you to directly interface with the Google Search Console API.

## Connecting Your Account

To get started, you'll need to authenticate your Google account via OAuth. 
1. Navigate to Settings > Integrations.
2. Click **Connect Google Account**.
3. Authorize the application.

## Caching Data

Because Oxide-SEO runs locally, it caches all your GSC data in a fast SQLite database, allowing you to bypass Google's arbitrary API limits when querying historical data.
