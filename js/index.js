const clipsRegex = /(?:twitch.tv\/\w+\/clip\/|clips.twitch.tv\/)(\w{3,})/i;

let qs;
let attachmentPoint = document.getElementById('clip-attachment');
let clipEmbed;
let isEnabled = true;
let muted = false;
let currentClipData = null;
let clipQueue = [];
let clipIsPlaying = false;
let clipClearShow = null;
let clipClearWait = null;
let clipClearClose = null;
let chatClient;

let ignoreNames = [ 'nightbot', 'redickulousnessbot' ];

function playClip(clipData) {
	if(clipIsPlaying) {
		clipQueue.push(clipData);
		return;
	}
	if('embed_url' in clipData === false || clipData.embed_url.length < 0) {
		playNextClip();
		return;
	}
	clipIsPlaying = true;
	clipEmbed.src = `${clipData.embed_url}&muted=${!!muted}&autoplay=true`;
	currentClipData = clipData;
}

function playNextClip() {
	let clipData = clipQueue.splice(0, 1)[0];
	playClip(clipData);
}

function closeClip() {
	attachmentPoint.style.right = -clipEmbed.width + 'px';
	clearTimeout(clipClearClose);
	clipClearClose = setTimeout(() => {
		clipIsPlaying = false;
		clipEmbed.src = '';
		if(clipQueue.length) {
			playNextClip();
		}
	}, 400);
}

function clipPlaying() {
	if(new URL(clipEmbed.src).origin !== 'https://clips.twitch.tv') {
		return;
	}
	clearTimeout(clipClearShow);
	clipClearShow = setTimeout(() => attachmentPoint.style.right = '0px', 500);
	clearTimeout(clipClearWait);
	clipClearWait = setTimeout(closeClip, (currentClipData.duration + 2) * 1000);
}

const _headers = {
		Accept: 'application/json',
		'Client-ID': '4g5an0yjebpf93392k4c5zll7d7xcec'
	};

function api(version) {
	return (endpoint, qs, headers = {}) => {
		let baseUrl = `https://api.twitch.tv/${version}/`;
		let uri = baseUrl + endpoint;
		if(qs) {
			let queryString = Object.entries(qs)
				.map(n => {
					if(Array.isArray(n[1])) {
						let key = encodeURIComponent(n[0]);
						return n[1].map(val => [ key, encodeURIComponent(val) ].join('='));
					}
					return n.map(encodeURIComponent).join('=');
				})
				.reduce((p, n) => p.concat(n), [])
				.join('&');
			if(queryString.length) {
				if(!uri.includes('?')) {
					uri += '?';
				}
				uri += queryString;
			}
		}
		let opts = { headers: new Headers(Object.assign({}, _headers, headers)) };
		return fetch(uri, opts).then(res => res.json());
	};
}

let helix = api('helix');
let kraken = api('kraken');

function getClips(id) {
	return kraken('clips/' + id, {}, { Accept: 'application/vnd.twitchtv.v5+json' });
}

function getUser(id) {
	return helix('users', { id });
}

async function messageReceived(channel, userstate, message, self) {
	if(self || ignoreNames.includes(userstate.username)) return;
	if(message[0] === '!') {
		let isBroadcaster = userstate.username === channel.slice(1);
		let isMod = userstate.mod || userstate['user-type'] === 'mod';
		let isSupreme = userstate.username === 'alca' || isBroadcaster;
		if(!(isMod || isSupreme)) {
			return;
		}
		let args = message.slice(1).split(' ');
		let commandName = args.shift();
		if(isSupreme && commandName === 'clipreload') {
			location.reload();
		}
		else if(isSupreme && commandName === 'forceclip') {
			let clipMatch = args[0].match(clipsRegex);
			if(clipMatch === null) {
				return;
			}
			let clipID = clipMatch[1];
			let clipData = await getClips(clipID);
			if(!clipData || clipData.error) {
				return;
			}
			playClip(clipData);
		}
		
		// Mod commands
		
		else if([ 'clipskip', 'skipclip' ].includes(commandName)) {
			closeClip();
		}
		else if([ 'cliptoggle', 'toggleclip' ].includes(commandName)) {
			isEnabled ^= 1;
		}
		else if([ 'clipenable', 'enableclip' ].includes(commandName)) {
			isEnabled = true;
		}
		else if([ 'clipdisable', 'disableclip' ].includes(commandName)) {
			isEnabled = false;
		}
		else if([
			'clipmutetoggle', 'cliptogglemute', 'togglemuteclip',
			'toggleclipmute', 'mutetoggleclip', 'mutecliptoggle'
		].includes(commandName)) {
			if(!muted) {
				closeClip();
			}
			muted ^= 1;
		}
		else if([ 'clipmute', 'muteclip' ].includes(commandName)) {
			if(!muted) {
				closeClip();
			}
			muted = true;
		}
		else if([ 'clipunmute', 'unmuteclip' ].includes(commandName)) {
			muted = false;
		}
	}
	else if(isEnabled && clipsRegex.test(message)) {
		let clipMatch = message.match(clipsRegex);
		if(clipMatch === null) {
			return;
		}
		let clipID = clipMatch[1];
		let clipData = await getClips(clipID);
		if(!clipData || clipData.error) {
			return;
		}
		// let { data: [ broadcasterData ] } = await getUsers(clipData.broadcaster_id);
		// if(!broadcasterData || broadcasterData.) {
		// 	return;
		// }
		if(clipData.broadcaster.id !== userstate['room-id']) {
			return;
		}
		playClip(clipData);
	}
}

window.addEventListener('load', () => {
	qs = !location.search.length ? {} : location.search.slice(1)
		.split('&')
		.map(n => n.split('=').map(decodeURIComponent))
		.reduce((p, n) => (p[n[0]] = n[1] || '', p), {});
	
	muted = [ 'true', '', '1', 't' ].includes((qs.muted || qs.mute).toLowerCase());
	
	chatClient = new tmi.client({
			connection: {
				reconnect: true,
				secure: true
			},
			channels: [ qs.channel || 'pootie33' ]
		});
	chatClient.on('join', (channel, user, self) => self && console.log('JOIN', channel));
	chatClient.on('message', messageReceived);
	chatClient.connect();
	
	clipEmbed = document.createElement('iframe');
	let scale = 'scale' in qs && qs.scale.length ? +qs.scale : 5;
	clipEmbed.width = 1920 / scale;
	clipEmbed.height = 1080 / scale;
	clipEmbed.frameBorder = 0;
	clipEmbed.scrolling = 'no';
	clipEmbed.preload = 'auto';
	attachmentPoint.style.right = -clipEmbed.width + 'px';
	attachmentPoint.appendChild(clipEmbed);
	clipEmbed.addEventListener('load', clipPlaying);
}, false);