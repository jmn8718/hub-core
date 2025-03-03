/* eslint-disable turbo/no-undeclared-env-vars */
import strava from "strava-v3";

export const updateToken = (token: string) => {
  strava.config({
    access_token: token,
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    redirect_uri: `${process.env.NEXT_PUBLIC_DOMAIN}/strava/oauth`,
  });
};

updateToken("");
export default strava;
