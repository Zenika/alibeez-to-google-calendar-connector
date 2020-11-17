import { removeIfExists, upsert } from "./google-calendar-actions.js";
import { fetchUserInfo } from "./persistence.js";

export async function pushToGoogleCalendar(leave, accessToken) {
  const { timeZone } = await fetchUserInfo(leave.userUuid);
  if (
    leave.status === "CANCEL_PENDING" ||
    leave.status === "CANCELED" ||
    leave.status === "REJECTED"
  ) {
    const eventId = mapId(leave);
    console.log(`Removing event '${eventId}'`, { leave });
    await removeIfExists("primary", eventId, accessToken);
  } else if (leave.status === "APPROVED" || leave.status === "PENDING") {
    const eventId = mapId(leave);
    const eventBody = mapEventBody(leave, timeZone);
    console.log(`Upserting event '${eventId}'`, { leave, event: eventBody });
    await upsert("primary", eventId, eventBody, accessToken);
  } else {
    console.error("ERROR: couldn't update leave, status uknown", leave.status);
  }
}

function mapId(leave) {
  return `alibeev${leave.uuid}`;
}

/**
 *
 * @param {*} leave
 * @param {string} timeZone
 */
function mapEventBody(leave, timeZone) {
  return {
    start: {
      dateTime: alibeezTimeToRealTime(leave.startDay, leave.startDayTime),
      timeZone,
    },
    end: {
      dateTime: alibeezTimeToRealTime(leave.endDay, leave.endDayTime),
      timeZone,
    },
    summary: "Absence",
    description: `Imported from Alibeez on ${new Date().toISOString()}`,
    reminders: {
      useDefault: false,
    },
    extendedProperties: {
      shared: {
        source: "Alibeez",
        lastSynchronizedAt: new Date().toISOString(),
      },
    },
  };
}

function alibeezTimeToRealTime(alibeezDate, alibeezTime) {
  if (alibeezTime === "MORNING") {
    return `${alibeezDate}T09:00:00`;
  } else if (alibeezTime === "NOON") {
    return `${alibeezDate}T13:00:00`;
  } else if (alibeezTime === "EVENING") {
    return `${alibeezDate}T18:00:00`;
  }
  throw new Error(`invalid alibeez time: '${alibeezTime}'`);
}
