# Clip Player

Links to Clips that are posted in the chat will automatically queue and play on the stream. Clips are limited to the targeted channel.

Note the future changes in the "To Do" section. Many of these will be breaking changes.

Here is a hosted version that you may use: `https://static.alca.tv/twitch/f/projects/clip-player/v1/`, just add the query string parameters as needed from below.

## Chat Commands

These commands are for channel moderators and the broadcaster.

| Name | Args | Description |
| --- | --- | --- |
| !forceclip | clip URL | Force a Clip to be queued. This will ignore the channel limit and queue. |
| !clipskip | | Skip the currently playing Clip. |
| !cliptoggle | | Toggle the Clip player.
| !clipenable | | Enable the Clip player.
| !clipdisable | | Disable the Clip player.
| !clipsubonly | | Toggle/enable/disable the sub-only mode.
| !clipmutetoggle | | Toggle the mute state of the player. Will automatically skip the current clip if changing to muted state.
| !clipmute | | Enable the mute state of the player. Similarly will skip the current clip.
| !clipunmute | | Disable the mute state of the player.
| !cliptestregion | | Show a test region. Useful for layout. You can see 

### Aliases

Commands also have a flipped order alias. For instance, `!clipskip` has `!skipclip` as an alias. `!clipmutetoggle` has 5 other aliases for the different orders just in case.

## Query String Parameters

| Name | Default | Description |
| --- | --- | --- |
| channel | | Required. Target this channel. |
| scale | 3 | Determines how large the player will appear within the source.
| animation-side | right | Edge the slide animation starts from. |
| muted | false | Set the Clip embed to muted by default. |
| sub-only | false | Require a user be subscribed, moderator, or the broadcaster in order to activate the Clip player. |
| ignore | | One or more usernames to ignore. Use separate instaces of &ignore=\<username\> to add more. Nightbot & Moobot are already ignored. |

### Channel

This ***required*** property should be the username of the channel that the IRC listener will JOIN.

`?channel=alca`

### Scale

The source can still be scaled down in the streaming software but it won't look good if scaled up. `1080 / scale` is how you can determine the preferred size. Larger numbers mean a smaller player. A value of `3` is 360p, `2` is 540p, `1.5` is 720p, etc.

`?channel=alca&scale=1.5`

### Animation-Side

Choose which side the slide animation starts from. You can choose from: `top`, `right`, `bottom`, or `left`.

`?channel=alca&animation-side=top`

*Aliases*: `anim-side`

### Muted

Append `&muted` to the URL to default to a muted state. No specified value is necessary. Setting it to anything but empty, `true`, `1`, or `t` or removing it will disable muting.

`?channel=alca&muted`

*Aliases*: `mute`

### Sub-Only

Required a user to be subscribed to the channel, be a moderator, or be the broadcaster in order to activate the Clip player. Can be altered 

`?channel=alca&sub-only`

*Aliases*: `subonly`, `sub-required`, `subrequired`

### Ignore

Add usernames to be ignored. Nightbot and Moobot are already ignored. Use additional `&ignore=`'s to ignore more than 1 username. (Comma-separated will not work.)

`?channel=alca&ignore=ChannelBot&ignore=MyOtherBot`

## Volume

Currently, volume level must be controlled by either muting it via command or QS or if possible, using the "interact" feature to mouse over and lower the volume in the embed while it's playing. This setting should be remembered.

In the future, this will be easily controllable by QS and commands.

## To Do

+ Change from using the official Twitch embed to just play the `.mp4` file directly.
	- This would allow for finer control and feedback.
		- Volume control (QS and command)
		- Playback events (ready and end)
		- Playback speed
			- Like slightly higher than 1 to speed up the overlay play time.
+ Automatically fit player to window size without a scale set.
	- Add command to change the scale?
+ Unify commands from -toggle/-enable/-disable to all-in-ones.
