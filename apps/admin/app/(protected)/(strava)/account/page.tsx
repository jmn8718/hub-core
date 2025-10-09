import strava from "@/lib/strava";
import type { StravaAthlete } from "@/types/strava";

export default async function AccountPage() {
	const profile = await (strava.client.athlete.get(
		{},
	) as Promise<StravaAthlete>);
	const { id, username, firstname, lastname, profile: image } = profile;
	return (
		<div>
			<p>ID: {id}</p>
			<p>Username: {username}</p>
			<p>First name: {firstname}</p>
			<p>Last name: {lastname}</p>
			<img
				src={image}
				alt={`${firstname} ${lastname} profile`}
				style={{ maxWidth: 200 }}
			/>
		</div>
	);
}
