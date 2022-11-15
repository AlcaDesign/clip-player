const express = require('express');
const { env } = process;

if(!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) {
	throw new Error('Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in env');
}

const appTokenCache = {
	token: null,
	expires: -Infinity,
};

const clipCache = new Map();

const app = express();
const server = app.listen(env.PORT, () => {
	const addr = server.address();
	if(typeof addr !== 'string') {
		console.log(`Listening http://localhost:${addr.port}`);
	}
});

app.get('/clip/:id', async (req, res) => {
	const clipData = await getClip(req.params.id);
});

function getAppToken() {
	const now = Date.now();
	if(appTokenCache.expires - now > 0) {
		return appTokenCache.token;
	}
	const getData = async () => {
		try {
			const qs = new URLSearchParams({
				client_id: env.TWITCH_CLIENT_ID,
				client_secret: env.TWITCH_CLIENT_SECRET,
				grant_type: 'client_credentials'
			});
			const res = await fetch(`https://id.twitch.tv/oauth2/token?${qs}`);
			const json = await res.json();
			if(!json.access_token) {
				throw json;
			}
			appTokenCache.expires = json.expires_in + now;
			return json.access_token;
		} catch(err) {
			console.error(json);
			appTokenCache.expires = -Infinity;
		}
	};
	appTokenCache.expires = Infinity;
	appTokenCache.token = getData();
	return appTokenCache.token;
}

function getClip(id) {
	if(clipCache.has(id)) {
		return clipCache.get(id);
	}
	const getData = async () => {
		const res = await fetch();
		const json = await res.json();
		return json;
	};
	const data = getData();
	clipCache.set(id, data);
	return data;
}