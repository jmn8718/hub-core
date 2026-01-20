"use client";

import Loader from "@/components/loader";
import type { StravaAthlete } from "@/types/strava";
import { Button } from "@repo/ui";
import { redirect, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AccountPage() {
	const router = useRouter();
	const [profile, setProfile] = useState<StravaAthlete | null>(null);
	const [removing, setRemoving] = useState(false);
	const [error, setError] = useState<string | null>(null);

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

	const handleRemove = () => {
		if (removing) return;
		setRemoving(true);
		setError(null);
		fetch("/api/strava/athlete", { method: "DELETE" })
			.then((res) => {
				if (!res.ok) throw new Error("Failed to remove profile");
				router.push("/authorize");
			})
			.catch((err) => setError(err.message))
			.finally(() => setRemoving(false));
	};

	if (!profile) return <Loader />;
	const { id, username, firstname, lastname, profile: image } = profile;
	return (
		<div className="flex gap-8">
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
			<div>
				<Button onClick={handleRemove} disabled={removing}>
					{removing ? "Removing..." : "Remove profile"}
				</Button>
				{error ? <p style={{ color: "red", marginTop: 8 }}>{error}</p> : null}
			</div>
		</div>
	);
}
