/* eslint-disable turbo/no-undeclared-env-vars */
import strava from "strava-v3";

class StravaClient {
	private readonly _client: typeof strava;

	constructor() {
		this._client = strava;
		this._client.config({
			access_token: "",
			client_id: process.env.STRAVA_CLIENT_ID,
			client_secret: process.env.STRAVA_CLIENT_SECRET,
			redirect_uri: `${process.env.NEXT_PUBLIC_DOMAIN}/strava/oauth`,
		});
	}

	get client() {
		return this._client;
	}

	setToken(token: string) {
		this._client.client(token);
		this._client.config({
			access_token: token,
			client_id: process.env.STRAVA_CLIENT_ID,
			client_secret: process.env.STRAVA_CLIENT_SECRET,
			redirect_uri: `${process.env.NEXT_PUBLIC_DOMAIN}/strava/oauth`,
		});
	}
}

export default new StravaClient();
