import { request, parseBodyAsJson } from "./http-client.js";

const FLAG_CALENDAR_EVENTS_AS_TESTS =
  process.env.FLAG_CALENDAR_EVENTS_AS_TESTS === "true";

if (FLAG_CALENDAR_EVENTS_AS_TESTS) {
  console.warn(
    `WARN: FLAG_CALENDAR_EVENTS_AS_TESTS is set to 'true'! Events written to Google Calendar will be flagged as tests.`
  );
}

export async function getCalendar(calendarId, accessToken) {
  const response = await request({
    url: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}

export async function insertEvent(calendarId, eventBody, accessToken) {
  if (FLAG_CALENDAR_EVENTS_AS_TESTS) {
    [eventBody] = flagAsTest(eventBody);
  }
  const response = await request({
    url: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}

export async function updateEvent(calendarId, eventId, eventBody, accessToken) {
  if (FLAG_CALENDAR_EVENTS_AS_TESTS) {
    [eventBody, eventId] = flagAsTest(eventBody, eventId);
  }
  const response = await request({
    url: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}

export async function removeEvent(calendarId, eventId, accessToken) {
  const response = await request({
    url: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}

function flagAsTest(eventBody, eventId) {
  const testEventId = eventId ? `test${eventId}` : eventId;
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
