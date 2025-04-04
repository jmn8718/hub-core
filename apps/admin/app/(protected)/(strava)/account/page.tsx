import strava from "@/lib/strava";

export default async function AccountPage() {
	const profile = await strava.athlete.get({});
	return <pre>{JSON.stringify(profile, null, 2)}</pre>;
}
