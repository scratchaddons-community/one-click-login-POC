import { createPrivateKey, createPublicKey, subtle } from "node:crypto";
import { readFile } from "node:fs/promises";
import http from "node:http";

import { SignJWT, jwtVerify } from "jose-node-esm-runtime";
import dotenv from "dotenv";
dotenv.config();

const JWT_ALGORITHM = "ES256",
	PRIVATE_KEY = createPrivateKey(
		`-----BEGIN EC PRIVATE KEY-----\n${process.env.EC_PRIVATE_KEY_0}\n${process.env.EC_PRIVATE_KEY_1}\n${process.env.EC_PRIVATE_KEY_2}\n-----END EC PRIVATE KEY-----\n`,
	),
	PUBLIC_KEY = createPublicKey(
		`-----BEGIN PUBLIC KEY-----\n${process.env.EC_PUBLIC_KEY_0}\n${process.env.EC_PUBLIC_KEY_1}\n-----END PUBLIC KEY-----\n`,
	);

const PROJECT_ID = "779756316";

http.createServer(async (request, response) => {
	const url = new URL(request.url || "", `https://${request.headers.host}`);
	const number = url.searchParams.get("number");
	if (number === null) {
		const [, jwt] =
			request.headers?.cookie
				?.split(`;`)
				.map(function (cookie) {
					let [name, ...rest] = cookie.split(`=`);
					name = name?.trim();
					if (!name) return;
					const value = rest.join(`=`).trim();
					if (!value) return;
					return [name, value];
				})
				.find(([name] = []) => name === "auth") || [];
		if (jwt) {
			const { payload } = await jwtVerify(jwt, PUBLIC_KEY, {
				algorithms: [JWT_ALGORITHM],
			});
			return response
				.writeHead(200, { "Content-Type": "text/html" })
				.end(`Logged in as <b>${payload.user}</b>`);
		}
	}
	const buffer = await subtle.digest("SHA-256", new TextEncoder().encode(number));
	const hash = Array.from(new Uint8Array(buffer), (bit) =>
		bit.toString(16).padStart(2, "0"),
	).join("");
	const decimalHash = BigInt("0x" + hash).toString(10);

	const logs = await fetch(
		`https://clouddata.scratch.mit.edu/logs?projectid=${PROJECT_ID}&limit=40&offset=0`,
	).then((response) => response.json());
	const user = logs.find((log) => log.value === decimalHash)?.user;
	if (!user)
		return response
			.writeHead(200, { "Content-Type": "text/html" })
			.end(await readFile("./index.html"));

	const jwt = await new SignJWT({ user })
		.setIssuedAt()
		.setProtectedHeader({ alg: JWT_ALGORITHM })
		.sign(PRIVATE_KEY);
	return response
		.writeHead(200, {
			"Content-Type": "text/html",
			"Set-Cookie": `auth=${jwt}; Max-Age=31536000`,
		})
		.end(`Logged in as <b>${user}</b>`);
}).listen(process.env.PORT ?? 443);
