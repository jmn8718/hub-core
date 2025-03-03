## admin

This package uses nextjs to deploy the backend responsible to manage the webhooks from strava.

It uses supabase for authentication. You have to create an account and a project on supabase and add a user to authenticate on the dashboard.

It uses the _db_ package to read and display the webhooks received.

It uses strava webhooks to configure the webhooks for the application. You need to create an application on your strava account.

It also uses strava oauth to authorize your strava app, so it can send webhooks when there is an update on the account.
