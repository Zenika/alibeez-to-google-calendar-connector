# Alibeez-to-Google-Calendar Connector

Syncs leaves from Alibeez to Google Calendar.

## How it works

The program needs permission from users to write to their calendars. Therefore,
the work of the program is divided into two phases: an initialization flow where
the program collects the permission of a user, and an update flow where leaves
for all users are sync'ed up.

### Initialization flow

- User hits `/` with their browser, where they are invited to give permission to
  the program to make changes to their calendars.
- If the user proceeds, the program completes the OAuth 2 dance and acquires
  some user information, including the necessary tokens to call the Calendar
  API.
- The program pulls the active future leaves of the user from Alibeez and copies
  them over to Calendar.

### Update flow

- At regular intervals, the program pulls all leaves that have been updated
  since the previous update flow.
- For leaves for which the user has given permission (i.e. tokens are known) the
  program either adds it to Calendar or removes it from Calendar, depending on
  its status.

## How to setup the project for local development

- Copy `.env.example` to `.env` then fill out `.env` with the required values.
  You may ask `dreamlab@zenika.com` for working values.
- Run `npm install` to install dependencies.
- Run `npm start` to run the app.

## Note on changing the format and schema of persisted files

This program persists data using JSON files. Since files already exist in
production, new versions of the program _must_ be backward compatible with the
format and schema of those files, unless there is a possibility and will to
notify all users that they are required to go through the initialization flow
again (which would persist new files).
