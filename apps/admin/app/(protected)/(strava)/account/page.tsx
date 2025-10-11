"use client";

import Loader from "@/components/loader";
import type { StravaAthlete } from "@/types/strava";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default function AccountPage() {
	const [profile, setProfile] = useState<StravaAthlete | null>(null);
	useEffect(() => {
		fetch("/api/strava/athlete")
			.then((response) => response.json())
			.then((data) => {
				if (!data) {
					return redirect("/authorize");
				}
				setProfile(data);
			})
			.catch(console.error);
	}, []);
	if (!profile) return <Loader />;
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
