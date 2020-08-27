import { request, parseBodyAsJson } from "./http-client.js";

export async function insert(calendarId, eventBody, accessToken) {
  const requestUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
  const requestOptions = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };
  const requestBody = JSON.stringify(eventBody);
  const response = await request(requestUrl, requestOptions, requestBody);
  if (response.status !== 200) {
    throw response;
  }
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}

export async function update(calendarId, eventId, eventBody, accessToken) {
  const requestUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`;
  const requestOptions = {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };
  const requestBody = JSON.stringify(eventBody);
  const response = await request(requestUrl, requestOptions, requestBody);
  if (response.status !== 200) {
    throw response;
  }
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}

export async function remove(calendarId, eventId, accessToken) {
  const requestUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`;
  const requestOptions = {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const response = await request(requestUrl, requestOptions);
  if (response.status !== 200) {
    throw response;
  }
  const responseBody = await parseBodyAsJson(response);
  return responseBody;
}

export function mapEventBody(item) {
    return {
      start: {
        dateTime: alibeezTimeToRealTime(
          item.startDay,
          item.startDayTime
        ).toISOString(),
        timeZone: "Europe/Paris",
      },
      end: {
        dateTime: alibeezTimeToRealTime(
          item.endDay,
          item.endDayTime
        ).toISOString(),
        timeZone: "Europe/Paris",
      },
      summary: "Congés (test, ignorer)",
    };
}

function alibeezTimeToRealTime(alibeezDate, alibeezTime) {
  if (alibeezTime === "MORNING") {
    const date = new Date(alibeezDate);
    date.setHours(9);
    return date;
  } else if (alibeezTime === "NOON") {
    const date = new Date(alibeezDate);
    date.setHours(13);
    return date;
  } else if (alibeezTime === "EVENING") {
    const date = new Date(alibeezDate);
    date.setHours(18);
    return date;
  }
  throw new Error(`invalid alibeez time: ${alibeezTime}`);
}
