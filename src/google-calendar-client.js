import { request, parseBodyAsJson } from "./http-client.js";

export async function insert(calendarId, eventBody, accessToken) {
  const response = await request({
    url: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });
  if (response.statusCode !== 200) {
    throw response;
  }
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}

export async function update(calendarId, eventId, eventBody, accessToken) {
  const response = await request({
    url: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });
  if (response.statusCode !== 200) {
    throw response;
  }
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}

export async function remove(calendarId, eventId, accessToken) {
  const response = await request({
    url: `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.statusCode !== 200) {
    throw response;
  }
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}
