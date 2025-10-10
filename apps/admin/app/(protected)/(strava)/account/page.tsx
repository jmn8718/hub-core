import strava from "@/lib/strava";

export default async function AccountPage() {
	const profile = await strava.getAthlete();
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
