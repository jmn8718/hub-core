export { webhooks} from './webhooks.js';

import activitiesDbData from "./data/activities.json" with { type: "json" };
import activitiesConnectionDbData from "./data/activities_connection.json" with { type: "json" };
import activityGearsDbData from "./data/activity_gear.json" with { type: "json" };
import gearsDbData from "./data/gear.json" with { type: "json" };
import gearsConnectionDbData from "./data/gear_connection.json" with { type: "json" };
import providerActivitiesDbData from "./data/provider_activities.json" with { type: "json" };
import providerGearsDbData from "./data/provider_gear.json" with { type: "json" };

export const data = {
  activitiesDbData: activitiesDbData.data,
  activitiesConnectionDbData: activitiesConnectionDbData.data,
  activityGearsDbData: activityGearsDbData.data,
  gearsDbData: gearsDbData.data,
  gearsConnectionDbData: gearsConnectionDbData.data,
  providerActivitiesDbData: (providerActivitiesDbData as {
    data: {
      "id": string,
      "provider": string,
      "timestamp":string,
      "original": "0" | "1",
      "data": string
    }[]
  }).data,
  providerGearsDbData: providerGearsDbData.data
}