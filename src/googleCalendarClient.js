import {
  jsonExchangeHttpRequest,
  jsonProducingHttpRequest,
} from "./utils/jsonHttpClient.js";

const DRY_RUN = process.env.DRY_RUN === "true";

if (DRY_RUN) {
  console.warn(
    "WARN: DRY_RUN is set to 'true'! Nothing will be written to Google Calendar."
  );
}

const FLAG_CALENDAR_EVENTS_AS_TESTS =
  process.env.FLAG_CALENDAR_EVENTS_AS_TESTS === "true";

if (FLAG_CALENDAR_EVENTS_AS_TESTS) {
  console.warn(
    `WARN: FLAG_CALENDAR_EVENTS_AS_TESTS is set to 'true'! Events written to Google Calendar will be flagged as tests.`
  );
}

export async function getCalendar(calendarId, accessToken) {
  return await jsonProducingHttpRequest(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

export async function insertEvent(calendarId, eventBody, accessToken) {
  if (DRY_RUN) {
    return;
  }
  if (FLAG_CALENDAR_EVENTS_AS_TESTS) {
    [eventBody] = flagAsTest(eventBody);
  }
  return await jsonExchangeHttpRequest(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
    eventBody
  );
}

export async function updateEvent(calendarId, eventId, eventBody, accessToken) {
  if (DRY_RUN) {
    return;
  }
  if (FLAG_CALENDAR_EVENTS_AS_TESTS) {
    [eventBody, eventId] = flagAsTest(eventBody, eventId);
  }
  return await jsonExchangeHttpRequest(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    },
    eventBody
  );
}

export async function removeEvent(calendarId, eventId, accessToken) {
  if (DRY_RUN) {
    return;
  }
  return await jsonProducingHttpRequest(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

function flagAsTest(eventBody, eventId) {
  const testEventId = eventId;
  const testEventBody = {
    ...eventBody,
    summary: `[TEST 🙈] ${eventBody?.summary ?? ""}`,
    extendedProperties: {
      ...eventBody?.extendedProperties,
      shared: {
        ...eventBody?.extendedProperties?.shared,
        test: true,
      },
    },
  };
  return [testEventBody, testEventId];
}
