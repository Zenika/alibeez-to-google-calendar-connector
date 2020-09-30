import { request, parseBodyAsJson } from "./http-client.js";

const DRY_RUN = process.env.DRY_RUN === "true";

if (DRY_RUN) {
  console.warn("WARN: DRY_RUN is set to 'true'! Nothing will be written to Google Calendar.")
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
  if (DRY_RUN) {
    return;
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
  if (DRY_RUN) {
    return;
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
  if (DRY_RUN) {
    return;
  }
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
