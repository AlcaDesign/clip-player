const clipsRegex = /(?:twitch.tv\/\w+\/clip\/|clips.twitch.tv\/)(\w{3,})/i;

let qs;
let attachmentPoint = document.getElementById('clip-attachment');
let clipEmbed;
let isEnabled = true;
let muted = false;
let subRequired = false;
let currentClipData = null;
let clipQueue = [];
let clipIsPlaying = false;
let clipClearShow = null;
let clipClearWait = null;
let clipClearClose = null;
let chatClient;

let ignoreNames = [ 'nightbot', 'moobot' ];

function playClip(clipData) {
	if(clipIsPlaying) {
		if(
			clipData.slug === currentClipData.slug ||
			clipQueue.some(n => clipData.slug === n.slug)
		) {
			return;
		}
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
	clipClearWait = setTimeout(
			closeClip,
			(currentClipData.duration + 2) * 1000
		);
}

const _headers = {
		Accept: 'application/json',
		'Client-ID': '4g5an0yjebpf93392k4c5zll7d7xcec'
	};
const v5Headers = { Accept: 'application/vnd.twitchtv.v5+json' };

function api(version) {
	return (endpoint, qs, headers = {}) => {
		let baseUrl = `https://api.twitch.tv/${version}/`;
		let uri = baseUrl + endpoint;
		if(qs) {
			let queryString = new URLSearchParams(qs).toString();
			if(queryString.length) {
				if(!uri.includes('?')) {
					uri += '?';
				}
				uri += queryString;
			}
		}
		let opts = { headers: Object.assign({}, _headers, headers) };
		return fetch(uri, opts).then(res => res.json());
	};
}

let helix = api('helix');
let kraken = api('kraken');

function getClipSource(id) {
	return fetch(`https://clips.twitch.tv/api/v2/clips/${id}/status`)
		.then(res => res.json())
		.then(data => data.quality_options[0].source);
}

function getClips(id) {
	return kraken('clips/' + id, {}, v5Headers);
}

function getUser(id) {
	return helix('users', { id });
}

async function messageReceived(channel, user, message, self) {
	if(self || ignoreNames.includes(user.username)) {
		return;
	}
	let isBroadcaster = user.username === channel.slice(1);
	let isMod = user.mod || user['user-type'] === 'mod';
	let isModUp = isMod || isBroadcaster;
	let isSub = user.subscriber || user.sub || user['user-type'] === 'sub';
	let isSubUp = isSub || isModUp;
	if(message[0] === '!') {
		// let isSupreme = user.username === 'alca' || isBroadcaster;
		// if(!(isMod || isSupreme)) {
		if(!isModUp) {
			return;
		}
		let args = message.slice(1).split(' ');
		let commandName = args.shift().toLowerCase();
		let [ arg0 ] = args;
		// Testing purposes
		// if(isSupreme && commandName === 'clipreload') {
		// 	location.reload();
		// }
		
		// Mod commands

		if([ 'forceclip', 'clipforce' ].includes(commandName)) {
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

		else if([ 'clipsubonly', 'subonlyclip' ].includes(commandName)) {
			if(!args.length) {
				subRequired ^= 1;
			}
			else if([ 'enable', 'on', 'enabled', 'start' ].includes(arg0)) {
				subRequired = true;
			}
			else if([ 'disable', 'off', 'disabled', 'stop' ].includes(arg0)) {
				subRequired = false;
			}
			else {
				subRequired ^= 1;
			}
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
		if(subRequired && !isSubUp) {
			return;
		}
		let clipMatch = message.match(clipsRegex);
		if(clipMatch === null) {
			return;
		}
		let clipID = clipMatch[1];
		let clipData = await getClips(clipID);
		if(!clipData || clipData.error) {
			return;
		}
		if(clipData.broadcaster.id !== user['room-id']) {
			return;
		}
		playClip(clipData);
	}
}

window.addEventListener('load', () => {
	qs = new URLSearchParams(location.search);
	let getQS = (...keys) => {
			for(let i = 0; i < keys.length; i++) {
				let v = qs.get(keys[i]);
				if(v !== null) {
					return v;
				}
			}
			return null;
		};
	
	let channel = getQS('channel');
	if(!channel) {
		return;
	}

	let truthyValues = [ 'true', '', '1', 't' ];

	let mutedByQS = getQS('muted', 'mute');
	if(mutedByQS !== null) {
		muted = truthyValues.includes(mutedByQS.toLowerCase());
	}
	
	let subRequiredQS = getQS('sub-only', 'subonly', 'sub-required',
			'subrequired');
	if(subRequiredQS !== null) {
		subRequired = truthyValues.includes(subRequiredQS.toLowerCase());
	}

	qs.getAll('ignore').forEach(n => ignoreNames.push(n.toLowerCase()));
	
	chatClient = new tmi.client({
			connection: {
				reconnect: true,
				secure: true
			},
			channels: [ channel ]
		});
	chatClient.on('join', (channel, user, self) =>
			self && console.log('JOIN', channel)
		);
	chatClient.on('message', messageReceived);
	chatClient.connect();
	
	clipEmbed = document.createElement('iframe');
	let scale = getQS('scale') || 3;
	clipEmbed.width = 1920 / scale;
	clipEmbed.height = 1080 / scale;
	clipEmbed.frameBorder = 0;
	clipEmbed.scrolling = 'no';
	clipEmbed.preload = 'auto';
	attachmentPoint.style.right = -clipEmbed.width + 'px';
	attachmentPoint.appendChild(clipEmbed);
	clipEmbed.addEventListener('load', clipPlaying);
}, false);