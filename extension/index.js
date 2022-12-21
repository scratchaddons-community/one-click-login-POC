const PROJECT_ID = "779756316";
const VARIABLE_NAME = "a";

(async () => {
	const number = Math.random();
	const buffer = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(number),
	);
	const hash = Array.from(new Uint8Array(buffer), (bit) =>
		bit.toString(16).padStart(2, "0"),
	).join("");
	const { user } = await fetch("https://scratch.mit.edu/session/", {
		headers: {
			"X-Requested-With": "XMLHttpRequest",
		},
	}).then((res) => res.json());
	const connection = new WebSocket("wss://clouddata.scratch.mit.edu");
	connection.onopen = async () => {
		connection.send(
			JSON.stringify({
				method: "handshake",
				project_id: PROJECT_ID,
				user: user?.username,
			}) + "\n",
		);
		setTimeout(() => {
			connection.send(
				JSON.stringify({
					value: BigInt("0x" + hash).toString(10),
					name: "☁ " + VARIABLE_NAME,
					method: "set",
					project_id: PROJECT_ID,
					user: user?.username,
				}) + "\n",
			);
			connection.close();
		}, 100);
	};
	connection.onclose = () => {
		window.opener.postMessage({ message: "setCloud", number },"*");
		window.close();
	};
	connection.onerror = console.error;
})();
